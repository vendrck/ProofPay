import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { appEnv } from "@/config/env";
import { db, schema } from "@/server/db/client";
import type { Viewer } from "./policy";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "pp_session";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  admin: boolean;
}

/** Admin is a role derived from ADMIN_EMAILS on every request, so removing an email revokes it at once. */
export const isAdminEmail = (email: string) => appEnv().ADMIN_EMAILS.includes(email.toLowerCase());

/** The signed-in user for this request (looked up once per request). */
export const currentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await db()
    .select({ id: schema.users.id, email: schema.users.email, name: schema.users.name })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return row ? { ...row, admin: isAdminEmail(row.email) } : null;
});

export async function currentViewer(): Promise<Viewer | null> {
  const user = await currentUser();
  return user ? { userId: user.id, admin: user.admin } : null;
}

/** Only same-site paths, so `?next=` can't send someone to another site after login. */
export function safeNext(next: string | null | undefined, fallback = "/jobs"): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}

/** For pages and actions that need a signed-in user; `next` is where to return after login. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return user;
}

/** Call at the top of every admin page AND every admin server action. Non-admins get a 404. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.admin) notFound();
  return user;
}

export async function startSession(userId: string): Promise<void> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600_000);
  // Housekeeping: drop this user's expired sessions.
  await db().delete(schema.sessions).where(and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, new Date())));
  await db().insert(schema.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db().delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}
