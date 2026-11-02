import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { after } from "next/server";
import { StatusBadge } from "@/app/jobs/status-badge";
import { requireAdmin } from "@/server/auth/session";
import { displayMoney } from "@/lib/labels";
import { listDisputeRows } from "@/server/disputes/service";
import { adminQueue, checkHolds } from "@/server/jobs/settlement";
import { SubmitButton } from "@/app/jobs/submit-button";

export const dynamic = "force-dynamic";

const WHY: Record<string, string> = {
  verified: "AI passed every criterion: approve the release",
  needs_review: "AI unsure or manual checks: review and decide",
  appealed: "A party appealed: review the drafted ruling",
  released: "Captured, payout pending: retry the payout",
  partially_released: "Captured, payout pending: retry the payout",
};

export default async function AdminPage() {
  await requireAdmin();
  const [{ actionable: queue, expiring }, disputes] = await Promise.all([adminQueue(), listDisputeRows()]);
  // No scheduler needed: each admin visit sweeps for expired holds after the page is sent.
  after(() => checkHolds().catch((err: unknown) => console.error("Hold check failed", err)));
  const openDisputes = disputes.filter((d) => d.decision === "pending").length;
  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h1>Admin queue</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Nothing moves money until you approve it here.
          </p>
        </div>
      </div>

      <div className="stats">
        <div>
          <b>{queue.length}</b>
          <span>waiting for a decision</span>
        </div>
        <div>
          <b>{expiring.length}</b>
          <span>holds expiring soon</span>
        </div>
        <Link href="/admin/disputes">
          <b>{openDisputes}</b>
          <span>PayPal disputes to answer →</span>
        </Link>
      </div>

      <div className="list-head">
        <h2>Waiting for you</h2>
      </div>
      {queue.length === 0 ? (
        <p className="muted">Nothing waiting.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Why it&apos;s here</th>
              <th>Status</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((job) => (
              <tr key={job.id}>
                <td>
                  <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                </td>
                <td className="muted">{WHY[job.status]}</td>
                <td>
                  <StatusBadge status={job.status} />
                </td>
                <td className="num">{displayMoney(job.amountMinor, job.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {expiring.length > 0 && (
        <>
          <div className="list-head">
            <h2>Holds about to expire</h2>
            <span className="small muted">PayPal holds last 29 days. Settle these first.</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Job</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="num">Days left</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map(({ job, daysLeft, expiresAt }) => (
                <tr key={job.id}>
                  <td>
                    <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                  </td>
                  <td>
                    <LocalTime date={expiresAt} dateOnly />
                  </td>
                  <td>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="num">{daysLeft === 0 ? "today" : daysLeft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  );
}
