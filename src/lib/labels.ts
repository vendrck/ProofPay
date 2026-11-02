/**
 * One place for turning raw values (minor units, PayPal enums) into words a
 * client or freelancer can read. Pure functions; safe on server and client.
 */

/** 12345 USD → "$123.45". Falls back to "123.45 XYZ" for currencies Intl doesn't know. */
export function displayMoney(minor: number, currency: string): string {
  const zeroDecimal = currency === "JPY";
  const value = zeroDecimal ? minor : minor / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(zeroDecimal ? 0 : 2)} ${currency}`;
  }
}

const PAYPAL_LABELS: Record<string, string> = {
  // Dispute reasons
  MERCHANDISE_OR_SERVICE_NOT_RECEIVED: "Not received",
  MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED: "Not as described",
  UNAUTHORISED: "Unauthorised payment",
  CREDIT_NOT_PROCESSED: "Credit not processed",
  DUPLICATE_TRANSACTION: "Duplicate transaction",
  INCORRECT_AMOUNT: "Incorrect amount",
  PAYMENT_BY_OTHER_MEANS: "Paid by other means",
  CANCELED_RECURRING_BILLING: "Cancelled recurring billing",
  PROBLEM_WITH_REMITTANCE: "Problem with remittance",
  OTHER: "Other",
  // Dispute stages
  INQUIRY: "Inquiry",
  CHARGEBACK: "Chargeback",
  PRE_ARBITRATION: "Pre-arbitration",
  ARBITRATION: "Arbitration",
  // Dispute statuses
  OPEN: "Open",
  WAITING_FOR_BUYER_RESPONSE: "Waiting for buyer",
  WAITING_FOR_SELLER_RESPONSE: "Waiting for us",
  UNDER_REVIEW: "Under review by PayPal",
  RESOLVED: "Resolved",
  // Payout / CI states
  SUCCESS: "Succeeded",
  PENDING: "Pending",
  PROCESSING: "Processing",
  DENIED: "Denied",
};

/** "WAITING_FOR_SELLER_RESPONSE" → "Waiting for us"; unknown values get sentence case. */
export function paypalLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const known = PAYPAL_LABELS[value];
  if (known) return known;
  const words = value.toLowerCase().replace(/[_.]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
