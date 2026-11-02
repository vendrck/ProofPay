import { LocalTime } from "@/components/local-time";
import { displayMoney } from "@/lib/labels";
import type { schema } from "@/server/db/client";

type Job = typeof schema.jobs.$inferSelect;

/** What happened to the client's money, in one line, with PayPal ids tucked away. */
export function MoneyPanel({ job }: { job: Job }) {
  const amount = displayMoney(job.amountMinor, job.currency);
  const released = job.releasedMinor ?? 0;
  const returned = job.amountMinor - released;

  let headline: string;
  let detail: React.ReactNode = null;
  if (job.captureId) {
    headline = `${displayMoney(released, job.currency)} released to the freelancer`;
    detail = (
      <>
        {returned > 0 && <>{displayMoney(returned, job.currency)} returned to the client · </>}
        {job.payoutBatchId ? "Payout sent" : "Payout not sent yet"}
      </>
    );
  } else if (job.status === "refunded") {
    headline = `${amount} returned to the client`;
    detail = "The hold was released; the client was never charged.";
  } else if (job.status === "hold_expired") {
    headline = `${amount} hold expired`;
    detail = "The client was never charged.";
  } else if (job.authorizationId) {
    headline = `${amount} held by PayPal`;
    detail = (
      <>
        Not charged yet
        {job.authorizationExpiresAt && (
          <>
            {" "}
            · hold ends <LocalTime date={job.authorizationExpiresAt} dateOnly />
          </>
        )}
        {job.reauthorizedAt && (
          <>
            {" "}
            · renewed <LocalTime date={job.reauthorizedAt} dateOnly />
          </>
        )}
      </>
    );
  } else {
    headline = `${amount} to hold`;
    detail = "Funding places a PayPal hold. Nothing is charged until the work is released.";
  }

  const refs = [
    ["Authorization", job.authorizationId],
    ["Renewed authorization", job.reauthorizationId],
    ["Capture", job.captureId],
    ["Payout batch", job.payoutBatchId],
  ].filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <section className="card money">
      <p className="money-label">Escrow</p>
      <p className="money-headline">{headline}</p>
      {detail && <p className="muted money-detail">{detail}</p>}
      {refs.length > 0 && (
        <details className="money-refs">
          <summary>PayPal references</summary>
          <dl className="facts">
            {refs.map(([label, value]) => (
              <div key={label} className="fact">
                <dt>{label}</dt>
                <dd className="mono">{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
}
