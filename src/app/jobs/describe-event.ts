import { displayMoney, paypalLabel } from "@/lib/labels";

/**
 * Audit events as sentences for the activity timeline. The raw type stays
 * available (the page shows it on hover) so nothing is hidden from a reviewer.
 */

export interface TimelineEvent {
  type: string;
  actor: string;
  data: unknown;
}

export interface EventContext {
  /** The job's held amount, for events whose payload doesn't carry it. */
  amountMinor: number;
  currency: string;
}

type Data = Record<string, unknown>;

const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function describeEvent(event: TimelineEvent, ctx: EventContext): string {
  const d: Data = event.data && typeof event.data === "object" ? (event.data as Data) : {};
  const money = (minor: number | undefined) => displayMoney(minor ?? ctx.amountMinor, ctx.currency);

  switch (event.type) {
    case "job.created":
      return `Client created the job for ${money(num(d.amountMinor))}`;
    case "criteria.drafted": {
      const count = num(d.count);
      return count ? `AI drafted ${count} acceptance criteria from the brief` : "AI drafted the acceptance criteria";
    }
    case "freelancer.joined":
      return "Freelancer accepted the invite";
    case "criterion.removed":
      return "Client removed a criterion";
    case "order.created":
      return "Client started PayPal checkout";
    case "payment.authorized":
      return `PayPal is holding ${money(undefined)} from the client (not charged)`;
    case "hold.reauthorized":
      return "PayPal renewed the hold so the money stays guaranteed";
    case "hold.reauthorize_failed":
      return "PayPal couldn't renew the hold; the original hold was used";
    case "hold.expired":
      return "The PayPal hold expired; the client was never charged";
    case "work.submitted": {
      const files = num(d.files);
      return files === undefined
        ? "Freelancer submitted a pull request"
        : `Freelancer submitted a pull request (${files} file${files === 1 ? "" : "s"} changed)`;
    }
    case "verification.started":
      return "AI started checking the work";
    case "verification.completed": {
      const overall = str(d.overall);
      if (overall === "pass") return "AI verified the work: every criterion passed";
      if (overall === "fail") return "AI verified the work: some criteria aren't met";
      return "AI verified the work: some criteria need a human look";
    }
    case "verification.retried":
      return "Verification was started again";
    case "verification.escalated":
      return "Admin took over the review (the AI verifier was unavailable)";
    case "verification.failed":
      return "AI verification couldn't finish (the verifier was unavailable)";
    case "appeal.filed":
      return `The ${event.actor} appealed the verdict`;
    case "appeal.ruling_drafted": {
      const pct = num(d.releasePercent);
      return pct === undefined ? "AI drafted a ruling on the appeal" : `AI drafted a ruling: release ${pct}% to the freelancer`;
    }
    case "appeal.ruling_failed":
      return "AI couldn't draft a ruling; the admin decides directly";
    case "appeal.decided": {
      const pct = num(d.releasePercent);
      return pct === undefined ? "Admin decided the appeal" : `Admin decided the appeal: release ${pct}% to the freelancer`;
    }
    case "funds.released": {
      const released = num(d.releasedMinor);
      const returned = num(d.returnedMinor) ?? 0;
      return returned > 0
        ? `Admin released ${money(released)}; ${displayMoney(returned, ctx.currency)} returned to the client`
        : `Admin released ${money(released)} to the freelancer`;
    }
    case "funds.refunded":
      return "Admin refunded the client; the hold was released";
    case "payout.sent":
      return "PayPal sent the payout to the freelancer";
    case "payout.failed":
      return "The payout to the freelancer failed; the admin can retry";
    case "dispute.drafted":
      return d.action === "accept_claim"
        ? "Copilot drafted a recommendation to accept the claim"
        : "Copilot drafted evidence for the dispute";
    case "dispute.draft_failed":
      return "Copilot couldn't draft a dispute response";
    case "dispute.evidence_submitted":
      return "Admin sent evidence to PayPal";
    case "dispute.claim_accepted":
      return "Admin accepted the client's claim in PayPal";
    case "dispute.synced":
    case "CUSTOMER.DISPUTE.CREATED":
    case "CUSTOMER.DISPUTE.UPDATED":
    case "CUSTOMER.DISPUTE.RESOLVED": {
      const reason = str(d.reason) ? ` (${paypalLabel(str(d.reason)).toLowerCase()})` : "";
      if (event.type === "CUSTOMER.DISPUTE.CREATED") return `Client opened a PayPal dispute${reason}`;
      return `PayPal dispute is now: ${paypalLabel(str(d.status)).toLowerCase()}${reason}`;
    }
    default:
      return event.type;
  }
}

/**
 * Review reasons are stored with the criterion's database id ("Criterion <uuid> is
 * uncertain."). Show the number the reader sees in the list instead.
 */
export function describeReviewReason(reason: string, criteria: { id: string }[]): string {
  return criteria.reduce((text, c, i) => text.replaceAll(c.id, String(i + 1)), reason);
}
