import { appEnv } from "@/config/env";
import { BrandMark } from "@/components/illustrations";
import { SubmitButton } from "@/app/jobs/submit-button";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const enabled = Boolean(appEnv().ADMIN_PASSWORD);
  return (
    <main className="container narrow">
      <section className="card" style={{ marginTop: 24 }}>
      <h1 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <BrandMark size={28} /> Admin sign in
      </h1>
      <p className="muted">Admins approve every release, refund and dispute response.</p>
      {!enabled && <p className="alert">Admin is disabled. Set ADMIN_PASSWORD (12+ characters) in the environment.</p>}
      {error && <p className="alert alert-error">Wrong password.</p>}
      {enabled && (
        <form action={loginAction} className="form">
          <label>
            Password
            <input name="password" type="password" required autoComplete="current-password" />
          </label>
          <SubmitButton pending="Checking…">Sign in</SubmitButton>
        </form>
      )}
      </section>
    </main>
  );
}
