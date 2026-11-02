import Link from "next/link";
import { EmptyIllustration } from "@/components/illustrations";
import { DateBlock } from "@/components/local-time";
import { displayMoney } from "@/lib/labels";
import { listJobs } from "@/server/jobs/service";
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

export default async function JobsPage() {
  const jobs = await listJobs();
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
            <p className="muted">Create a job to try the escrow flow in the PayPal sandbox.</p>
            <Link className="btn btn-primary" href="/jobs/new">
              Start a job
            </Link>
          </div>
        </div>
      ) : (
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
      )}
    </main>
  );
}
