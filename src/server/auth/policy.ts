/**
 * Who may do what on a job. Pure, so every rule is unit-tested; every server
 * action calls `assertCan` before touching the job. Status rules (e.g. "only a
 * draft can be funded") stay in the services and the state machine.
 */

export interface Viewer {
  userId: string;
  admin: boolean;
}

export interface JobParties {
  clientUserId: string | null;
  freelancerUserId: string | null;
}

export type Party = "client" | "freelancer";

export const JOB_ACTIONS = [
  "view",
  "editCriteria",
  "fund",
  "acceptInvite",
  "submitWork",
  "retryVerification",
  "appeal",
  "settle",
] as const;
export type JobAction = (typeof JOB_ACTIONS)[number];

/** The viewer's side of this job, if any. The client wins if somehow both (can't happen: see acceptInvite). */
export function partyOf(viewer: Viewer | null, job: JobParties): Party | null {
  if (!viewer) return null;
  if (job.clientUserId === viewer.userId) return "client";
  if (job.freelancerUserId === viewer.userId) return "freelancer";
  return null;
}

export function can(viewer: Viewer | null, action: JobAction, job: JobParties): boolean {
  if (!viewer) return false;
  const party = partyOf(viewer, job);
  switch (action) {
    case "view":
      return viewer.admin || party !== null;
    case "editCriteria":
    case "fund":
      return party === "client";
    case "acceptInvite":
      // Anyone signed in except the client, and only while the seat is empty.
      return job.freelancerUserId === null && job.clientUserId !== viewer.userId;
    case "submitWork":
      return party === "freelancer";
    case "retryVerification":
      return party === "freelancer" || viewer.admin;
    case "appeal":
      return party !== null;
    case "settle":
      return viewer.admin;
  }
}

export class ForbiddenError extends Error {
  override name = "ForbiddenError";
  constructor(readonly action: JobAction) {
    super(`You can't ${ACTION_TEXT[action]} on this job.`);
  }
}

const ACTION_TEXT: Record<JobAction, string> = {
  view: "view this job",
  editCriteria: "change the criteria",
  fund: "fund the job",
  acceptInvite: "accept this invite",
  submitWork: "submit work",
  retryVerification: "rerun verification",
  appeal: "file an appeal",
  settle: "settle the job",
};

export function assertCan(viewer: Viewer | null, action: JobAction, job: JobParties): void {
  if (!can(viewer, action, job)) throw new ForbiddenError(action);
}
