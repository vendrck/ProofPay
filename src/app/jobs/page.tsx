import Link from "next/link";
import { EmptyIllustration } from "@/components/illustrations";
import { DateBlock } from "@/components/local-time";
import { displayMoney } from "@/lib/labels";
import { requireUser } from "@/server/auth/session";
import { type Job, listJobs } from "@/server/jobs/service";
import { jobProgress } from "./progress";
import { StatusBadge } from "./status-badge";

export const dynamic = "force-dynamic";

const initials = (title: string) =>
  title
    .split(/\s+/)
    .filter((w) => /^[a-z0-9]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "J";

function JobList({ jobs }: { jobs: Job[] }) {
  return (
    <ul className="list">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link href={`/jobs/${job.id}`} className="list-row">
            <DateBlock date={job.createdAt} />
            <span className="avatar" aria-hidden>
              {initials(job.title)}
            </span>
            <span className="list-title">
              {job.title}
              <span className="list-sub">{jobProgress(job.status).headline}</span>
            </span>
            <StatusBadge status={job.status} />
            <span className="list-meta">{displayMoney(job.amountMinor, job.currency)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function JobsPage() {
  const user = await requireUser("/jobs");
  const jobs = await listJobs({ userId: user.id, admin: user.admin });
  const asClient = jobs.filter((j) => j.clientUserId === user.id);
  const asFreelancer = jobs.filter((j) => j.freelancerUserId === user.id);
  const others = jobs.filter((j) => j.clientUserId !== user.id && j.freelancerUserId !== user.id);
  return (
    <main className="container">
      <div className="page-head">
        <h1>Activity</h1>
        <Link className="btn btn-primary" href="/jobs/new">
          New job
        </Link>
      </div>
      {jobs.length === 0 ? (
        <div className="empty">
          <EmptyIllustration />
          <div>
            <h2>No jobs yet</h2>
            <p className="muted">
              Create a job to hire someone, or open an invite link a client sent you to work on theirs.
            </p>
            <Link className="btn btn-primary" href="/jobs/new">
              Start a job
            </Link>
          </div>
        </div>
      ) : (
        <>
          {asClient.length > 0 && (
            <>
              <div className="list-head">
                <h2>As client</h2>
                <span className="small muted">Jobs you created and pay for</span>
              </div>
              <JobList jobs={asClient} />
            </>
          )}
          {asFreelancer.length > 0 && (
            <>
              <div className="list-head">
                <h2>As freelancer</h2>
                <span className="small muted">Jobs you deliver and get paid for</span>
              </div>
              <JobList jobs={asFreelancer} />
            </>
          )}
          {others.length > 0 && (
            <>
              <div className="list-head">
                <h2>All other jobs</h2>
                <span className="small muted">Visible because you are an admin</span>
              </div>
              <JobList jobs={others} />
            </>
          )}
        </>
      )}
    </main>
  );
}
