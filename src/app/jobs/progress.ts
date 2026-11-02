import type { JobStatus } from "@/server/escrow/state-machine";

/**
 * Where a job is in its life, in words: which step, whose turn, what happens
 * next. Pure, so every status is covered by a unit test.
 */

export const STEPS = [
  { id: "agree", label: "Agree" },
  { id: "fund", label: "Fund" },
  { id: "deliver", label: "Deliver" },
  { id: "verify", label: "Verify" },
  { id: "release", label: "Release" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

export type Turn = "client" | "freelancer" | "ai" | "admin" | "nobody";
export type Tone = "info" | "good" | "warn" | "bad" | "neutral";

export interface Progress {
  step: StepId;
  /** `done`: the whole flow is finished. `blocked`: it can't continue. */
  state: "active" | "done" | "blocked";
  turn: Turn;
  tone: Tone;
  headline: string;
  message: string;
  /** Show the extra Dispute step after Release. */
  dispute: boolean;
}

export interface ProgressContext {
  /** The last verification attempt failed (AI unavailable) and nothing is running. */
  verificationFailed?: boolean;
}

type Base = Omit<Progress, "dispute" | "state"> & { state?: Progress["state"]; dispute?: boolean };

const BY_STATUS: Record<JobStatus, Base> = {
  draft: {
    step: "agree",
    turn: "client",
    tone: "info",
    headline: "Review the criteria, then fund the job",
    message: "Remove any criterion you don't agree with. Funding only places a hold; nothing is charged yet.",
  },
  awaiting_payment: {
    step: "fund",
    turn: "client",
    tone: "info",
    headline: "Finish the PayPal checkout",
    message: "Checkout was started but the hold isn't approved yet.",
  },
  funded: {
    step: "deliver",
    turn: "freelancer",
    tone: "info",
    headline: "Submit the work as a pull request",
    message: "PayPal is holding the money. The AI checks the PR against the agreed criteria.",
  },
  rejected: {
    step: "deliver",
    turn: "freelancer",
    tone: "bad",
    headline: "Some criteria aren't met yet",
    message: "Fix the work and resubmit, or appeal if you think the verdict is wrong. The money stays held.",
  },
  submitted: {
    step: "verify",
    turn: "ai",
    tone: "info",
    headline: "The AI is checking the work",
    message: "It compares the pull request with each criterion. This page updates by itself.",
  },
  verified: {
    step: "verify",
    turn: "admin",
    tone: "good",
    headline: "Every criterion passed. Waiting for release",
    message: "An admin approves the release. Either party can still appeal before money moves.",
  },
  needs_review: {
    step: "verify",
    turn: "admin",
    tone: "warn",
    headline: "A person is reviewing the verdict",
    message: "The AI wasn't confident about some criteria, so an admin decides.",
  },
  appealed: {
    step: "verify",
    turn: "admin",
    tone: "warn",
    headline: "Appeal under review",
    message: "The AI drafted a ruling; an admin makes the final call before any money moves.",
  },
  released: {
    step: "release",
    state: "done",
    turn: "nobody",
    tone: "good",
    headline: "Done. The freelancer has been paid",
    message: "The client was charged and the full amount was paid out.",
  },
  partially_released: {
    step: "release",
    state: "done",
    turn: "nobody",
    tone: "good",
    headline: "Settled with a partial release",
    message: "Part of the amount went to the freelancer; the rest of the hold was returned to the client.",
  },
  refunded: {
    step: "release",
    state: "done",
    turn: "nobody",
    tone: "neutral",
    headline: "Refunded. The client was never charged",
    message: "The PayPal hold was released.",
  },
  hold_expired: {
    step: "release",
    state: "blocked",
    turn: "client",
    tone: "bad",
    headline: "The PayPal hold expired",
    message: "The client was never charged. To continue, create a new job and fund it again.",
  },
  disputed: {
    step: "release",
    turn: "admin",
    tone: "bad",
    dispute: true,
    headline: "The client opened a PayPal dispute",
    message: "The copilot drafts a response from this job's history; an admin submits it to PayPal.",
  },
  dispute_closed: {
    step: "release",
    state: "done",
    turn: "nobody",
    tone: "neutral",
    dispute: true,
    headline: "The PayPal dispute is closed",
    message: "Nothing else to do on this job.",
  },
};

export function jobProgress(status: JobStatus, ctx: ProgressContext = {}): Progress {
  const base = BY_STATUS[status];
  const progress: Progress = { ...base, state: base.state ?? "active", dispute: base.dispute ?? false };
  if (status === "submitted" && ctx.verificationFailed) {
    return {
      ...progress,
      turn: "freelancer",
      tone: "warn",
      headline: "Verification didn't finish",
      message: "The AI verifier was unavailable. The work is saved; retry verification.",
    };
  }
  return progress;
}

/** Position of a step relative to the current one, for styling the stepper. */
export function stepState(step: StepId, progress: Progress): "done" | "current" | "todo" {
  const at = STEPS.findIndex((s) => s.id === progress.step);
  const i = STEPS.findIndex((s) => s.id === step);
  if (i < at) return "done";
  if (i > at) return "todo";
  return progress.state === "done" || progress.dispute ? "done" : "current";
}

export const TURN_LABEL: Record<Turn, string> = {
  client: "Client's turn",
  freelancer: "Freelancer's turn",
  ai: "AI working",
  admin: "Admin's turn",
  nobody: "Finished",
};

/** A run with no result after this long is treated as lost (e.g. the server restarted mid-run). */
export const VERIFICATION_STALE_MS = 10 * 60 * 1000;

/**
 * Is AI verification of the latest submission still running? Derived from the
 * audit trail (oldest first) so it survives page reloads without extra columns.
 */
export function verificationRun(
  events: { type: string; createdAt: Date }[],
  now: Date,
): "running" | "failed" | "idle" {
  let last: { type: string; createdAt: Date } | undefined;
  for (const e of events) {
    if (e.type === "work.submitted" || e.type.startsWith("verification.")) last = e;
  }
  if (!last || last.type === "verification.completed") return "idle";
  if (last.type === "verification.failed") return "failed";
  // work.submitted (run about to start) or verification.started
  return now.getTime() - last.createdAt.getTime() > VERIFICATION_STALE_MS ? "failed" : "running";
}
