import Link from "next/link";
import { notFound } from "next/navigation";
import { decideAppealAction, retryPayoutAction, settleAction } from "@/app/admin/actions";
import { DecisionForm } from "@/app/admin/decision-form";
import { isAdmin } from "@/server/admin/auth";
import type { AppealRuling } from "@/server/ai/appeal";
import type { Verification } from "@/server/ai/verify";
import { displayMoney } from "@/lib/labels";
import type { PrSnapshot } from "@/server/github/pull-request";
import { getJobView, JobError } from "@/server/jobs/service";
import { pendingAppeal } from "@/server/jobs/settlement";
import { fundAction, removeCriterionAction, retryVerificationAction } from "../actions";
import { AutoRefresh } from "../auto-refresh";
import { jobProgress, verificationRun } from "../progress";
import { StatusBadge } from "../status-badge";
import { SubmitButton } from "../submit-button";
import { Activity } from "./activity";
import { AppealForm } from "./appeal-form";
import { MoneyPanel } from "./money-panel";
import { Stepper, TurnBanner } from "./progress-tracker";
import { SubmitWorkForm } from "./submit-work-form";
import { DeliveryCard } from "./delivery-card";
import { VerdictCard } from "./verdict-card";

export const dynamic = "force-dynamic";

const CHECK_LABEL = { ci_pass: "CI", diff_matches: "Code", manual: "Manual" } as const;

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; funding?: string }>;
}) {
  const [{ id }, { error, funding }] = await Promise.all([params, searchParams]);
  const view = await getJobView(id).catch((err: unknown) => {
    if (err instanceof JobError) notFound();
    throw err;
  });
  const { job, criteria, latestSubmission, verdict, events } = view;
  const [admin, appeal] = await Promise.all([isAdmin(), pendingAppeal(job.id)]);
  const ruling = appeal?.copilotRuling as (AppealRuling & { model?: string }) | null | undefined;
  const canDecide = job.status === "verified" || job.status === "needs_review";
  const canAppeal = job.status === "verified" || job.status === "rejected" || job.status === "needs_review";
  const amount = displayMoney(job.amountMinor, job.currency);
  const verification = verdict?.results as Verification | undefined;
  const snapshot = latestSubmission?.snapshot as PrSnapshot | undefined;
  const run = job.status === "submitted" ? verificationRun(events, new Date()) : "idle";
  const progress = jobProgress(job.status, { verificationFailed: run === "failed" });

  const heldNow = job.authorizationId && !job.captureId && job.status !== "refunded" && job.status !== "hold_expired";
  const showAdmin = admin && (canDecide || appeal || (job.captureId && !job.payoutBatchId));

  return (
    <main>
      <section className="job-head">
        <div className="job-head-inner">
          <Link href="/jobs" className="back">
            ← Activity
          </Link>
          <div className="job-title">
            <div>
              <h1>{job.title}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="amount">
              {amount}
              <span>{heldNow ? "held by PayPal" : job.captureId ? "settled" : job.authorizationId ? "not charged" : "job value"}</span>
            </p>
          </div>
          <Stepper progress={progress} />
        </div>
      </section>

      <div className="container">
        {error && <p className="alert alert-error">{error}</p>}
        {funding === "cancelled" && <p className="alert">PayPal checkout was cancelled. Nothing was charged.</p>}
        {run === "running" && <AutoRefresh />}

        <div className="job-layout">
          <div>
            <section className="card">
              <h2>Brief</h2>
              <p className="prewrap">{job.brief}</p>
            </section>
            <section className="card">
              <div className="section-head">
                <h2>Acceptance criteria</h2>
                <span className="small muted">
                  Drafted by AI ·{" "}
                  {job.status === "draft" ? "remove anything you don't agree with before funding" : "frozen once funded"}
                </span>
              </div>
              <ol className="criteria">
                {criteria.map((c) => (
                  <li key={c.id}>
                    <span className="criterion-text">{c.text}</span>
                    <span className={`tag tag-${c.check}`}>{CHECK_LABEL[c.check]}</span>
                    {job.status === "draft" && criteria.length > 1 && (
                      <form action={removeCriterionAction.bind(null, job.id, c.id)}>
                        <SubmitButton variant="link" pending="Removing…">
                          Remove
                        </SubmitButton>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            {snapshot && <DeliveryCard snapshot={snapshot} />}

            {(job.status === "funded" || job.status === "rejected") && (
              <section className="card">
                <h2>{job.status === "rejected" ? "Resubmit work" : "Submit work"}</h2>
                <SubmitWorkForm jobId={job.id} />
              </section>
            )}

            {job.status === "submitted" && run === "running" && (
              <section className="card">
                <h2>Verifying…</h2>
                <p className="muted">
                  The AI is reading the pull request and checking each criterion. You can leave this page; it updates by
                  itself.
                </p>
              </section>
            )}

            {job.status === "submitted" && run === "failed" && (
              <section className="card">
                <h2>Verification didn&apos;t finish</h2>
                <p className="muted">The work is saved. Run the check again.</p>
                <form action={retryVerificationAction.bind(null, job.id)}>
                  <SubmitButton pending="Starting…">Retry verification</SubmitButton>
                </form>
              </section>
            )}

            {verification && verdict && (
              <VerdictCard verification={verification} snapshot={snapshot} model={verdict.model} criteria={criteria} />
            )}

            {appeal && (
              <section className="card">
                <h2>Appeal by the {appeal.raisedBy}</h2>
                <p className="prewrap">{appeal.reason}</p>
                {ruling ? (
                  <div className="ruling">
                    <div className="section-head">
                      <strong>AI draft ruling</strong>
                      <span className="badge badge-info">
                        {ruling.outcome} · {ruling.releasePercent}% to freelancer
                      </span>
                    </div>
                    <p>{ruling.rationale}</p>
                    {ruling.considerations.length > 0 && (
                      <ul className="small muted">
                        {ruling.considerations.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    )}
                    {ruling.model && <p className="small muted">Drafted by {ruling.model}. Awaiting admin decision.</p>}
                  </div>
                ) : (
                  <p className="muted small">No AI draft available; the admin decides directly.</p>
                )}
              </section>
            )}

            {canAppeal && (
              <section className="card">
                <h2>Disagree with the verdict?</h2>
                <p className="muted small">
                  Either party can appeal before money moves. The AI drafts a ruling from the criteria and the evidence; an
                  admin makes the final call.
                </p>
                <AppealForm jobId={job.id} />
              </section>
            )}

            <Activity events={events} ctx={{ amountMinor: job.amountMinor, currency: job.currency }} />
          </div>

          <aside className="rail">
            <TurnBanner progress={progress} />
            <MoneyPanel job={job} />

            {(job.status === "draft" || job.status === "awaiting_payment") && (
              <section className="card">
                <form action={fundAction.bind(null, job.id)}>
                  <SubmitButton variant="paypal" block pending="Opening PayPal…">
                    {job.status === "awaiting_payment" ? "Continue to PayPal" : "Fund with PayPal"}
                  </SubmitButton>
                </form>
                <p className="small muted" style={{ margin: "8px 0 0" }}>
                  A hold of {amount} on the client&apos;s PayPal account. Nothing is charged until release.
                </p>
              </section>
            )}

            {showAdmin && (
              <section className="card card-admin">
                <h2>Admin decision</h2>
                {appeal ? (
                  <DecisionForm
                    action={decideAppealAction.bind(null, job.id, appeal.id)}
                    defaultPercent={ruling?.releasePercent ?? 100}
                    heldLabel={amount}
                    submitLabel={ruling ? "Decide appeal" : "Decide appeal (no draft)"}
                  />
                ) : canDecide ? (
                  <DecisionForm
                    action={settleAction.bind(null, job.id)}
                    defaultPercent={job.status === "verified" ? 100 : 0}
                    heldLabel={amount}
                    submitLabel="Settle"
                  />
                ) : (
                  <form action={retryPayoutAction.bind(null, job.id)}>
                    <p className="muted">Funds are captured but the payout didn&apos;t go through.</p>
                    <SubmitButton pending="Paying out…">Retry payout</SubmitButton>
                  </form>
                )}
              </section>
            )}

            {(job.status === "disputed" || job.status === "dispute_closed") && (
              <section className="card">
                <h2>PayPal dispute</h2>
                <p className="muted small">
                  {job.status === "disputed"
                    ? "The copilot drafts a response from this job's history; an admin submits it."
                    : "The PayPal dispute on this job is closed."}
                </p>
                {admin && <Link href="/admin/disputes">Open disputes</Link>}
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
