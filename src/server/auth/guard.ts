import { type Job, loadJob } from "@/server/jobs/store";
import { assertCan, type JobAction, type Party, partyOf } from "./policy";
import { type CurrentUser, requireUser } from "./session";

/**
 * The one check every job action runs first: signed in (else off to /login),
 * the job exists, and this user may do `action` on it.
 */
export async function authorizeJob(
  jobId: string,
  action: JobAction,
): Promise<{ user: CurrentUser; job: Job; party: Party | null }> {
  const user = await requireUser(`/jobs/${jobId}`);
  const job = await loadJob(jobId);
  const viewer = { userId: user.id, admin: user.admin };
  assertCan(viewer, action, job);
  return { user, job, party: partyOf(viewer, job) };
}
