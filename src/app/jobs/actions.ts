"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { authorizeJob } from "@/server/auth/guard";
import { readInviteToken } from "@/server/auth/invite";
import { ForbiddenError } from "@/server/auth/policy";
import { requireUser } from "@/server/auth/session";
import { InvalidTransitionError } from "@/server/escrow/state-machine";
import {
  acceptInvite,
  createJob,
  JobError,
  markVerificationRetried,
  removeCriterion,
  runVerification,
  startFunding,
  submitWork,
} from "@/server/jobs/service";
import { draftRuling, fileAppeal } from "@/server/jobs/settlement";
import { PayPalApiError } from "@/server/paypal/client";

const newJobSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  brief: z.string().trim().min(20, "Describe the work in at least a sentence or two").max(5000),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Amount must look like 100 or 99.50"),
  currency: z.enum(["USD", "EUR", "GBP"]),
  repoUrl: z.union([z.literal(""), z.url().startsWith("https://github.com/", "Repository must be on github.com")]),
});

/** Turn known, user-facing failures into a message; let real bugs surface. */
function messageFor(err: unknown): string {
  if (err instanceof JobError || err instanceof InvalidTransitionError || err instanceof ForbiddenError) return err.message;
  if (err instanceof Error && /pull request URL/.test(err.message)) return err.message;
  if (err instanceof PayPalApiError) {
    console.error(err);
    return `PayPal rejected the request: ${err.message}`;
  }
  const github = githubMessage(err);
  if (github) return github;
  console.error(err);
  return "Something went wrong. Check the server log.";
}

/** Octokit throws an "HttpError" carrying the HTTP status; say what it means for the freelancer. */
function githubMessage(err: unknown): string | null {
  if (!(err instanceof Error) || err.name !== "HttpError") return null;
  const status = (err as { status?: unknown }).status;
  if (status === 404) return "GitHub couldn't find that pull request. Check the link; the repository must be public.";
  if (status === 401 || status === 403) return "GitHub refused to show that pull request (private repository or rate limit). Try again in a minute.";
  if (typeof status === "number") return `GitHub returned an error (${status}). Try again in a minute.`;
  return null;
}

const back = (path: string, error: string): never => redirect(`${path}?error=${encodeURIComponent(error)}`);

/**
 * State for forms driven by `useActionState`. On an error the action hands the
 * typed values back, so the form re-renders with them instead of going blank.
 */
export interface FormState {
  error?: string;
  values?: Record<string, string>;
}

const valuesOf = (formData: FormData): Record<string, string> =>
  Object.fromEntries([...formData].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

/** Verify in the background; the job page polls until a verdict lands. */
function verifyLater(jobId: string) {
  after(() => runVerification(jobId).catch((err: unknown) => console.error("Verification failed", err)));
}

export async function createJobAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/jobs/new");
  const values = valuesOf(formData);
  const parsed = newJobSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input", values };

  let jobId: string;
  try {
    jobId = await createJob(parsed.data, { id: user.id, email: user.email, admin: user.admin });
  } catch (err) {
    return { error: messageFor(err), values };
  }
  redirect(`/jobs/${jobId}?created=1`);
}

export async function removeCriterionAction(jobId: string, criterionId: string) {
  try {
    await authorizeJob(jobId, "editCriteria");
    await removeCriterion(jobId, criterionId);
  } catch (err) {
    return back(`/jobs/${jobId}`, messageFor(err));
  }
  redirect(`/jobs/${jobId}`);
}

export async function fundAction(jobId: string) {
  let url: string;
  try {
    await authorizeJob(jobId, "fund");
    url = await startFunding(jobId);
  } catch (err) {
    return back(`/jobs/${jobId}`, messageFor(err));
  }
  redirect(url); // to PayPal; it returns to /jobs/[id]/funded
}

export async function submitWorkAction(jobId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData);
  const prUrl = (values.prUrl ?? "").trim();
  try {
    await authorizeJob(jobId, "submitWork");
    await submitWork(jobId, prUrl);
  } catch (err) {
    return { error: messageFor(err), values };
  }
  verifyLater(jobId);
  redirect(`/jobs/${jobId}`);
}

export async function retryVerificationAction(jobId: string) {
  try {
    await authorizeJob(jobId, "retryVerification");
    // Logged before the redirect so the page already shows the run as in progress.
    await markVerificationRetried(jobId);
  } catch (err) {
    return back(`/jobs/${jobId}`, messageFor(err));
  }
  verifyLater(jobId);
  redirect(`/jobs/${jobId}`);
}

const appealSchema = z.object({
  reason: z.string().trim().min(20, "Explain the appeal in at least a sentence").max(3000),
});

export async function fileAppealAction(jobId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData);
  const parsed = appealSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid appeal", values };
  try {
    // Which side is appealing comes from the login, not from the form.
    const { party } = await authorizeJob(jobId, "appeal");
    if (!party) throw new JobError("Only the client or the freelancer can appeal.");
    const appealId = await fileAppeal(jobId, party, parsed.data.reason);
    // The ruling can take a while; draft it after the page has answered.
    after(() => draftRuling(appealId).catch((err: unknown) => console.error("Appeal ruling failed", err)));
  } catch (err) {
    return { error: messageFor(err), values };
  }
  redirect(`/jobs/${jobId}`);
}

const acceptSchema = z.object({ paypalEmail: z.email("Enter the PayPal email you want to be paid at").max(200) });

export async function acceptInviteAction(token: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = valuesOf(formData);
  // The signed invite link is what entitles someone to the seat, not knowing the job id.
  const jobId = readInviteToken(token);
  if (!jobId) return { error: "This invite link isn't valid.", values };
  const parsed = acceptSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid email", values };
  try {
    const { user } = await authorizeJob(jobId, "acceptInvite");
    await acceptInvite(jobId, user.id, parsed.data.paypalEmail.trim().toLowerCase());
  } catch (err) {
    return { error: messageFor(err), values };
  }
  redirect(`/jobs/${jobId}`);
}
