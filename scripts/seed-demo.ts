/**
 * Create (or reset) the demo admin account judges log in with:
 *   npm run seed:demo
 * The password comes from DEMO_ADMIN_PASSWORD; nothing happens if it is unset.
 * Re-running resets the password. The account only gets the admin role if its
 * email is also listed in ADMIN_EMAILS. Judges sign up their own client and
 * freelancer accounts.
 * Touches only the users table (and the sessions of the reset account).
 */
import { eq } from "drizzle-orm";
import { appEnv } from "@/config/env";
import { hashPassword, PASSWORD_MIN } from "@/server/auth/password";
import { db, schema } from "@/server/db/client";

try {
  process.loadEnvFile(".env"); // locally; on Render the variables are already in the environment
} catch {
  // no .env file
}

const ADMIN = { email: "admin@demo.dev", name: "Ada (demo admin)" };

async function main() {
  const password = process.env.DEMO_ADMIN_PASSWORD;
  if (!password) {
    console.log(`skip  ${ADMIN.email}  (DEMO_ADMIN_PASSWORD not set)`);
    process.exit(0);
  }
  if (password.length < PASSWORD_MIN) throw new Error(`DEMO_ADMIN_PASSWORD must be at least ${PASSWORD_MIN} characters`);
  const passwordHash = await hashPassword(password);
  const [user] = await db()
    .insert(schema.users)
    .values({ email: ADMIN.email, name: ADMIN.name, passwordHash })
    .onConflictDoUpdate({ target: schema.users.email, set: { passwordHash, name: ADMIN.name } })
    .returning({ id: schema.users.id });
  if (user) await db().delete(schema.sessions).where(eq(schema.sessions.userId, user.id)); // old logins end
  console.log(`ready ${ADMIN.email}`);
  if (!appEnv().ADMIN_EMAILS.includes(ADMIN.email)) {
    console.warn(`note  add ${ADMIN.email} to ADMIN_EMAILS, or the demo admin is just a normal user`);
  }
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
