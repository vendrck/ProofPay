import Link from "next/link";
import { HeroIllustration, StepIcon } from "@/components/illustrations";
import { currentUser } from "@/server/auth/session";

const STEPS = [
  { icon: "agree", title: "Agree", body: "AI turns the brief into acceptance criteria both sides can check." },
  { icon: "fund", title: "Fund", body: "The client's PayPal payment is authorized and held, not charged." },
  { icon: "deliver", title: "Deliver", body: "The freelancer submits the work as a GitHub pull request." },
  { icon: "verify", title: "Verify", body: "AI checks the work against every criterion and explains why." },
  { icon: "release", title: "Release", body: "An admin approves; PayPal captures and pays the freelancer." },
  { icon: "defend", title: "Defend", body: "Appeals and PayPal disputes get a response drafted from the record." },
] as const;

export default async function HomePage() {
  const user = await currentUser();
  return (
    <main>
      <section className="hero-band">
        <div className="hero">
          <div>
            <p className="eyebrow">Escrow for freelance work</p>
            <h1>
              Get paid when the work is <em>proven</em>, not when someone remembers.
            </h1>
            <p className="lede">
              The client&apos;s money is held by PayPal. AI checks the pull request against the agreed criteria. A person
              approves the release, and PayPal pays the freelancer out.
            </p>
            <div className="hero-cta">
              {user ? (
                <>
                  <Link className="btn btn-primary" href="/jobs/new">
                    Start a job
                  </Link>
                  <Link className="btn btn-secondary" href="/jobs">
                    Your activity
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-primary" href="/signup?next=/jobs/new">
                    Start a job
                  </Link>
                  <Link className="btn btn-secondary" href="/login">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hero-art">
            <HeroIllustration />
          </div>
        </div>
      </section>

      <div className="container">
        <div className="trust">
          <span>Money held by PayPal until release</span>
          <span>AI drafts, never moves money</span>
          <span>Every decision approved by a person</span>
          <span>Full audit trail for disputes</span>
        </div>

        <section className="how">
          <h2>How it works</h2>
          <ol className="how-grid">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <StepIcon name={step.icon} />
                <span className="how-step">STEP {i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="split">
          <div>
            <h2>For clients</h2>
            <p className="muted">Pay for outcomes you wrote down, not promises.</p>
            <ul>
              <li>Nothing is charged until the work passes and an admin approves the release.</li>
              <li>Edit the AI&apos;s criteria before you fund. They freeze once money is held.</li>
              <li>Disagree with a verdict? Appeal before any money moves.</li>
            </ul>
          </div>
          <div>
            <h2>For freelancers</h2>
            <p className="muted">Know the money exists before you start.</p>
            <ul>
              <li>The hold is visible from day one, with its expiry date.</li>
              <li>Each criterion is judged separately, with links to the evidence in your diff.</li>
              <li>Payout goes straight to your PayPal email on release.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
