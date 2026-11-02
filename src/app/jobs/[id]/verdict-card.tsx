import { createHash } from "node:crypto";
import type { CriterionVerdict, Verification } from "@/server/ai/verify";
import type { PrSnapshot } from "@/server/github/pull-request";

const VERDICT: Record<CriterionVerdict, { icon: string; label: string }> = {
  pass: { icon: "✓", label: "Meets it" },
  fail: { icon: "✗", label: "Doesn't meet it" },
  uncertain: { icon: "?", label: "Needs a human look" },
};

const OVERALL: Record<CriterionVerdict, { tone: string; text: string }> = {
  pass: { tone: "good", text: "Every criterion is met" },
  fail: { tone: "bad", text: "Some criteria aren't met" },
  uncertain: { tone: "warn", text: "A person needs to check some criteria" },
};

const DECIDED_BY = { ci: "CI result", model: "AI", human: "Admin" } as const;

/** GitHub anchors each file in a PR's "Files changed" tab by the SHA-256 of its path. */
function fileLink(snapshot: PrSnapshot, file: string): string {
  return `${snapshot.url}/files#diff-${createHash("sha256").update(file).digest("hex")}`;
}

export function VerdictCard({
  verification,
  snapshot,
  model,
  criteria,
}: {
  verification: Verification;
  snapshot?: PrSnapshot;
  model: string;
  criteria: { id: string; text: string }[];
}) {
  const overall = OVERALL[verification.overall];
  const position = new Map(criteria.map((c, i) => [c.id, { n: i + 1, text: c.text }]));
  const tally = (v: CriterionVerdict) => verification.results.filter((r) => r.verdict === v).length;

  return (
    <section className="card">
      <div className="section-head">
        <h2>AI verdict</h2>
        <span className={`badge badge-${overall.tone}`}>{overall.text}</span>
      </div>
      <p className="muted small">
        {tally("pass")} met · {tally("fail")} not met · {tally("uncertain")} unsure
        {snapshot && (
          <>
            {" · "}
            <a href={snapshot.url} target="_blank" rel="noreferrer">
              {snapshot.owner}/{snapshot.repo}#{snapshot.number}
            </a>
          </>
        )}
      </p>
      <ul className="results">
        {verification.results.map((r) => {
          const c = position.get(r.criterionId);
          const v = VERDICT[r.verdict];
          return (
            <li key={r.criterionId} className={`result result-${r.verdict}`}>
              <div className="result-head">
                <span className="result-icon" aria-hidden>
                  {v.icon}
                </span>
                <strong className="result-title">{c ? `${c.n}. ${c.text}` : "Removed criterion"}</strong>
                <span className="result-label">{v.label}</span>
              </div>
              <p>{r.reasoning}</p>
              {snapshot && r.evidence.length > 0 && (
                <ul className="evidence">
                  {r.evidence.map((e) => (
                    <li key={`${e.file}:${e.note}`}>
                      <a href={fileLink(snapshot, e.file)} target="_blank" rel="noreferrer" className="mono">
                        {e.file}
                      </a>{" "}
                      <span className="muted">{e.note}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="small muted result-meta">
                Decided by {DECIDED_BY[r.decidedBy]} · {Math.round(r.confidence * 100)}% confident
              </p>
            </li>
          );
        })}
      </ul>
      {verification.reviewReasons.length > 0 && (
        <div className="alert">
          <strong>Why a person reviews this:</strong>
          <ul>
            {verification.reviewReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted">
        CI {snapshot?.ci.state ?? "unknown"} · {snapshot?.files.length ?? 0} files checked · model {model}
      </p>
    </section>
  );
}
