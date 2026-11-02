import Link from "next/link";
import { BriefIllustration } from "@/components/illustrations";
import { requireUser } from "@/server/auth/session";
import { NewJobForm } from "./new-job-form";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  await requireUser("/jobs/new");
  return (
    <main className="container">
      <Link href="/jobs" className="back">
        ← Activity
      </Link>
      <div className="page-head">
        <h1>New job</h1>
      </div>
      <div className="form-layout">
        <section className="card">
          <NewJobForm />
        </section>
        <aside className="aside">
          <BriefIllustration />
          <div className="aside-body">
            <h2>What happens next</h2>
            <ol>
              <li>
                <strong>AI drafts the criteria</strong> from your brief. You can remove any before paying.
              </li>
              <li>
                <strong>You fund with PayPal.</strong> It&apos;s a hold on your account, not a charge.
              </li>
              <li>
                <strong>You send the freelancer an invite link.</strong> They accept and add their PayPal email.
              </li>
              <li>
                <strong>The freelancer submits a pull request</strong> and the AI checks it.
              </li>
              <li>
                <strong>An admin releases the money</strong>, or returns it if the work doesn&apos;t pass.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}
