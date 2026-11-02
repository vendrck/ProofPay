import { type Progress, STEPS, stepState, TURN_LABEL } from "../progress";

/** Agree → Fund → Deliver → Verify → Release (→ Dispute), as a flat tab-like strip. */
export function Stepper({ progress }: { progress: Progress }) {
  const steps: { id: string; label: string; state: string }[] = STEPS.map((s) => ({
    id: s.id,
    label: s.label,
    state: stepState(s.id, progress),
  }));
  if (progress.dispute) steps.push({ id: "dispute", label: "Dispute", state: progress.state === "done" ? "done" : "current" });

  return (
    <ol className={`stepper progress-${progress.state}`} aria-label="Job progress">
      {steps.map((s, i) => (
        <li key={s.id} className={`step step-${s.state}`} aria-current={s.state === "current" ? "step" : undefined}>
          <span className="step-dot">{s.state === "done" ? "✓" : i + 1}</span>
          <span className="step-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Whose turn it is and what happens next. */
export function TurnBanner({ progress }: { progress: Progress }) {
  return (
    <div className={`banner banner-${progress.tone}`} role="status">
      <span className="banner-turn">{TURN_LABEL[progress.turn]}</span>
      <strong className="banner-headline">{progress.headline}</strong>
      <span className="banner-message">{progress.message}</span>
    </div>
  );
}
