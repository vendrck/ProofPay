"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { InvalidTransitionError } from "@/server/escrow/state-machine";
import { PayPalApiError } from "@/server/paypal/client";
import { draftForDispute, draftMissing, respondToDispute, syncDisputes } from "@/server/disputes/service";
import { decideAppeal, retryPayout, settleJob } from "@/server/jobs/settlement";
import { escalateToReview } from "@/server/jobs/service";
import { JobError } from "@/server/jobs/store";

function messageFor(err: unknown): string {
  if (err instanceof JobError || err instanceof InvalidTransitionError) return err.message;
  if (err instanceof PayPalApiError) return `PayPal rejected the request: ${err.message}`;
  console.error(err);
  return "Something went wrong. Check the server log.";
}

const back = (jobId: string, error: string): never =>
  redirect(`/jobs/${jobId}?error=${encodeURIComponent(error)}`);

const decisionSchema = z.object({
  releasePercent: z.coerce.number().int().min(0).max(100),
  note: z.string().trim().max(1000).default(""),
  confirm: z.literal("yes", { error: "Tick the confirmation box: this moves real (sandbox) money." }),
});

export async function settleAction(jobId: string, formData: FormData) {
  await requireAdmin();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(jobId, parsed.error.issues[0]?.message ?? "Invalid decision");
  try {
    await settleJob(jobId, parsed.data.releasePercent, parsed.data.note || "Admin decision");
  } catch (err) {
    return back(jobId, messageFor(err));
  }
  redirect(`/jobs/${jobId}`);
}

export async function decideAppealAction(jobId: string, appealId: string, formData: FormData) {
  await requireAdmin();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(jobId, parsed.error.issues[0]?.message ?? "Invalid decision");
  try {
    await decideAppeal(appealId, parsed.data.releasePercent, parsed.data.note);
  } catch (err) {
    return back(jobId, messageFor(err));
  }
  redirect(`/jobs/${jobId}`);
}

/** The AI verifier is down: the admin takes the decision over (no money moves yet). */
export async function escalateAction(jobId: string) {
  await requireAdmin();
  try {
    await escalateToReview(jobId);
  } catch (err) {
    return back(jobId, messageFor(err));
  }
  redirect(`/jobs/${jobId}`);
}

export async function retryPayoutAction(jobId: string) {
  await requireAdmin();
  try {
    await retryPayout(jobId);
  } catch (err) {
    return back(jobId, messageFor(err));
  }
  redirect(`/jobs/${jobId}`);
}

const disputePath = (id: string, error?: string): never =>
  redirect(`/admin/disputes/${id}${error ? `?error=${encodeURIComponent(error)}` : ""}`);

export async function syncDisputesAction() {
  await requireAdmin();
  let count: number;
  try {
    count = await syncDisputes();
  } catch (err) {
    return redirect(`/admin/disputes?error=${encodeURIComponent(messageFor(err))}`);
  }
  // The copilot can take minutes on a slow model; draft after the page has answered.
  after(() => draftMissing().catch((err: unknown) => console.error("Dispute drafting failed", err)));
  redirect(`/admin/disputes?synced=${count}`);
}

export async function redraftDisputeAction(disputeId: string) {
  await requireAdmin();
  after(() => draftForDispute(disputeId).catch((err: unknown) => console.error("Dispute drafting failed", err)));
  redirect(`/admin/disputes/${disputeId}?drafting=1`);
}

const disputeResponseSchema = z.object({
  action: z.enum(["provide_evidence", "accept_claim"]),
  claimNote: z.string().max(2000).default(""),
  confirm: z.literal("yes", { error: "Tick the confirmation box: this answers the dispute in PayPal." }),
});

export async function respondDisputeAction(disputeId: string, formData: FormData) {
  await requireAdmin();
  const parsed = disputeResponseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return disputePath(disputeId, parsed.error.issues[0]?.message ?? "Invalid response");
  const notes = formData.getAll("evidenceNote").map((v) => String(v));
  const types = formData.getAll("evidenceType").map((v) => String(v));
  try {
    await respondToDispute(disputeId, {
      action: parsed.data.action,
      evidences: notes.map((note, i) => ({ type: types[i] ?? "OTHER", notes: note })),
      claimNote: parsed.data.claimNote,
    });
  } catch (err) {
    return disputePath(disputeId, messageFor(err));
  }
  disputePath(disputeId);
}
