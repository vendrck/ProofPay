"use client";

import { useState } from "react";

/** The client's invite link for the freelancer, with a copy button. Others just see that the seat is open. */
export function InviteCard({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <section className="card">
      <h2>Freelancer</h2>
      {url ? (
        <>
          <p className="small muted">No freelancer yet. Send them this link; they sign in, accept, and add their PayPal email.</p>
          <div className="copy-row">
            <input readOnly value={url} aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </>
      ) : (
        <p className="small muted">Waiting for the invited freelancer to accept.</p>
      )}
    </section>
  );
}
