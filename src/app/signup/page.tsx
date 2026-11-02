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
          <BrandMark size={28} /> Create your account
        </h1>
        <p className="muted">One account works for both sides: hire as a client, or get paid as a freelancer.</p>
        <AuthForm mode="signup" next={next} />
      </section>
    </main>
  );
}
