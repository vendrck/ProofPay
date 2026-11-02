import type { PrSnapshot } from "@/server/github/pull-request";

const MAX_FILES = 6;

/**
 * The submitted pull request as a picture: one bar per file, green for added
 * lines and red for removed, drawn from the stored snapshot (no external image
 * service to rate-limit the demo).
 */
export function DeliveryCard({ snapshot }: { snapshot: PrSnapshot }) {
  const files = [...snapshot.files].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));
  const shown = files.slice(0, MAX_FILES);
  const added = files.reduce((n, f) => n + f.additions, 0);
  const removed = files.reduce((n, f) => n + f.deletions, 0);
  const widest = Math.max(1, ...shown.map((f) => f.additions + f.deletions));

  return (
    <section className="card">
      <div className="section-head">
        <h2>Delivery</h2>
        <span className={`badge badge-${snapshot.ci.state === "passed" ? "good" : snapshot.ci.state === "failed" ? "bad" : "neutral"}`}>
          CI {snapshot.ci.state}
        </span>
      </div>
      <a className="pr-card" href={snapshot.url} target="_blank" rel="noreferrer">
        <svg viewBox="0 0 200 120" className="pr-art" role="img" aria-label={`${added} lines added, ${removed} removed`}>
          <rect width="200" height="120" fill="var(--ill-sky)" />
          {shown.map((f, i) => {
            const total = f.additions + f.deletions;
            const w = Math.max(6, (total / widest) * 150);
            const addW = total ? (f.additions / total) * w : w;
            const y = 14 + i * 16;
            return (
              <g key={f.filename}>
                <rect x="14" y={y} width="10" height="10" rx="2" fill="var(--ill-line)" />
                <rect x="32" y={y} width={addW} height="10" fill="var(--ill-good)" />
                <rect x={32 + addW} y={y} width={w - addW} height="10" fill="var(--bad)" />
              </g>
            );
          })}
        </svg>
        <span className="pr-body">
          <span className="pr-repo">
            {snapshot.owner}/{snapshot.repo} · #{snapshot.number}
          </span>
          <strong className="pr-title">{snapshot.title}</strong>
          <span className="pr-stats">
            {files.length} file{files.length === 1 ? "" : "s"} · <span className="plus">+{added}</span>{" "}
            <span className="minus">−{removed}</span>
          </span>
          <span className="pr-files">
            {shown.map((f) => (
              <span key={f.filename} className="mono">
                {f.filename}
              </span>
            ))}
            {files.length > MAX_FILES && <span>and {files.length - MAX_FILES} more</span>}
          </span>
        </span>
      </a>
    </section>
  );
}
