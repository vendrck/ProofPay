import { redirect } from "next/navigation";
import { AuthForm } from "@/app/account/auth-form";
import { BrandMark } from "@/components/illustrations";
import { currentUser, safeNext } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await currentUser()) redirect(next);
  return (
    <main className="container narrow">
      <section className="card" style={{ marginTop: 24 }}>
        <h1 className="auth-title">
          <BrandMark size={28} /> Log in
        </h1>
        <p className="muted">Welcome back. Your jobs and payouts are waiting.</p>
        <AuthForm mode="login" next={next} />
      </section>
    </main>
  );
}
