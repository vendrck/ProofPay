import Link from "next/link";
import { BriefIllustration } from "@/components/illustrations";
import { NewJobForm } from "./new-job-form";

export default function NewJobPage() {
  // Dev convenience: prefill the sandbox test accounts so a demo job can't pay a made-up address.
  const dev = process.env.NODE_ENV !== "production";
  const defaults = {
    clientEmail: dev ? process.env.SPIKE_CLIENT_EMAIL : undefined,
    freelancerEmail: dev ? process.env.SPIKE_FREELANCER_EMAIL : undefined,
  };
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
          <NewJobForm defaults={defaults} />
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
