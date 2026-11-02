import { setTimeout as sleep } from "node:timers/promises";
import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { appEnv } from "@/config/env";
import { db, schema } from "@/server/db/client";
import { dummyHash, hashPassword, verifyPassword } from "./password";
import { hashIp } from "./tokens";

/** A user-facing auth failure; pages show its message as is. */
export class AuthError extends Error {
  override name = "AuthError";
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Emails in ADMIN_EMAILS can't be registered through the form: sign-up doesn't
 * verify ownership, so whoever claimed an unregistered admin email first would
 * become admin. Admin accounts are made with `npm run seed:demo` instead.
 */
export const reservedForAdmin = (email: string, adminEmails: readonly string[]) =>
  adminEmails.includes(normalizeEmail(email));

/** First hop of X-Forwarded-For (Render's proxy sets it); "local" in dev. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function signUp(input: { email: string; name: string; password: string }): Promise<string> {
  const env = appEnv();
  const email = normalizeEmail(input.email);
  if (reservedForAdmin(email, env.ADMIN_EMAILS)) throw new AuthError("This email can't be used to sign up.");
  const ipHash = hashIp(await clientIp(), env.AUTH_SECRET);

  const hourAgo = new Date(Date.now() - 3600_000);
  const [recent] = await db()
    .select({ n: count() })
    .from(schema.users)
    .where(and(eq(schema.users.signupIpHash, ipHash), gt(schema.users.createdAt, hourAgo)));
  if ((recent?.n ?? 0) >= env.SIGNUPS_PER_IP_PER_HOUR) {
    throw new AuthError("Too many sign-ups from this network. Try again in an hour.");
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db()
    .insert(schema.users)
    .values({ email, name: input.name.trim(), passwordHash, signupIpHash: ipHash })
    .onConflictDoNothing({ target: schema.users.email })
    .returning({ id: schema.users.id });
  if (!user) throw new AuthError("An account with this email already exists. Log in instead.");
  return user.id;
}

/** Returns the user id, or throws one generic message so it doesn't reveal which emails exist. */
export async function logIn(emailInput: string, password: string): Promise<string> {
  const email = normalizeEmail(emailInput);
  const user = await db().query.users.findFirst({ where: eq(schema.users.email, email) });
  // Always run one scrypt verification, so unknown emails take as long as wrong passwords.
  const ok = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) {
    await sleep(750); // slow down guessing
    throw new AuthError("Wrong email or password.");
  }
  return user.id;
}
