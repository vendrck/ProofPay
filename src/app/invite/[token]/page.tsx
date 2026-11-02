import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BrandMark } from "@/components/illustrations";
import { displayMoney } from "@/lib/labels";
import { readInviteToken } from "@/server/auth/invite";
import { can } from "@/server/auth/policy";
import { currentUser } from "@/server/auth/session";
import { JobError, loadJob } from "@/server/jobs/store";
import { AcceptInviteForm } from "./accept-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const jobId = readInviteToken(token);
  if (!jobId) notFound();
  const job = await loadJob(jobId).catch((err: unknown) => {
    if (err instanceof JobError) notFound();
    throw err;
  });
  const user = await currentUser();
  const here = `/invite/${token}`;

  // Already in: the freelancer (or the client) just goes to the job.
  if (user && (job.freelancerUserId === user.id || job.clientUserId === user.id)) redirect(`/jobs/${job.id}`);

  const open = job.freelancerUserId === null;
  return (
    <main className="container narrow">
      <section className="card" style={{ marginTop: 24 }}>
        <h1 className="auth-title">
          <BrandMark size={28} /> You&apos;re invited
        </h1>
        <p className="muted">A client wants to hire you on ProofPay. The money is held by PayPal before you start.</p>
        <dl className="facts" style={{ margin: "12px 0 16px" }}>
          <dt>Job</dt>
          <dd>
            <strong>{job.title}</strong>
          </dd>
          <dt>Pay</dt>
          <dd>{displayMoney(job.amountMinor, job.currency)}</dd>
        </dl>
        {!open ? (
          <p className="alert">This invite has already been accepted.</p>
        ) : !user ? (
          <div className="hero-cta">
            <Link className="btn btn-primary" href={`/signup?next=${encodeURIComponent(here)}`}>
              Create an account
            </Link>
            <Link className="btn btn-secondary" href={`/login?next=${encodeURIComponent(here)}`}>
              Log in
            </Link>
          </div>
        ) : can({ userId: user.id, admin: user.admin }, "acceptInvite", job) ? (
          <AcceptInviteForm jobId={job.id} defaultEmail={user.email} />
        ) : (
          <p className="alert">You can&apos;t accept this invite.</p>
        )}
      </section>
    </main>
  );
}
