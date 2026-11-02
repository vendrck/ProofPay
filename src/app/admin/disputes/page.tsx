import Link from "next/link";
import { paypalLabel } from "@/lib/labels";
import { SubmitButton } from "@/app/jobs/submit-button";
import { requireAdmin } from "@/server/admin/auth";
import { listDisputeRows, type StoredDraft } from "@/server/disputes/service";
import { syncDisputesAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; synced?: string }>;
}) {
  await requireAdmin();
  const [{ error, synced }, rows] = await Promise.all([searchParams, listDisputeRows()]);

  return (
    <main className="container">
      <Link href="/admin" className="back">
        ← Admin queue
      </Link>
      <div className="page-head">
        <h1>PayPal disputes</h1>
        <form action={syncDisputesAction}>
          <SubmitButton variant="secondary" pending="Syncing and drafting…">
            Sync from PayPal
          </SubmitButton>
        </form>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        Claims buyers filed with PayPal after money was released. The copilot drafts each response from the audit trail;
        nothing reaches PayPal until you submit it.
      </p>
      {error && <p className="alert alert-error">{error}</p>}
      {synced && (
        <p className="alert">
          Synced {synced} dispute(s) from the last 30 days. The copilot drafts new ones in the background; refresh in a
          few minutes.
        </p>
      )}

      {rows.length === 0 ? (
        <p className="muted">No disputes yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Dispute</th>
              <th>Reason</th>
              <th>Job</th>
              <th>Copilot</th>
              <th>PayPal status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const draft = d.copilotDraft as StoredDraft | null;
              return (
                <tr key={d.id}>
                  <td>
                    <Link href={`/admin/disputes/${d.id}`} className="mono">
                      {d.paypalDisputeId}
                    </Link>
                  </td>
                  <td>{paypalLabel(d.reason)}</td>
                  <td className="muted">{d.jobId ? "Linked" : "No match"}</td>
                  <td className="muted">
                    {d.decision !== "pending"
                      ? "Answered"
                      : draft
                        ? draft.action === "accept_claim"
                          ? "Draft: accept claim"
                          : "Draft: send evidence"
                        : "No draft yet"}
                  </td>
                  <td>
                    <span className={`badge badge-${d.decision === "pending" ? "warn" : "good"}`}>{paypalLabel(d.status)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </main>
  );
}
