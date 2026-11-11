# ProofPay

**Escrow for freelance work. AI verifies the delivery; PayPal holds and releases the money.**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline Nov 12, 2026).

1. **Agree:** AI turns a job brief into acceptance criteria both sides can check.
2. **Fund:** the client pays with PayPal. The payment is *authorized* (held), not captured.
3. **Verify:** AI checks the delivered work (a GitHub PR) against every criterion and gives its reasons.
4. **Release:** an admin approves; PayPal captures the full amount or part of it, and the freelancer is paid out.
5. **Defend:** a **dispute copilot** drafts responses to platform appeals (before capture) and to PayPal disputes (after capture), using the evidence trail. Nothing is submitted until an admin approves.

> **Live demo (PayPal sandbox):** https://proofpay-hux0.onrender.com
>
> Sign up as a client, create a job, and send the invite link to a second account (the freelancer). The demo admin is `admin@demo.dev`; its password is in the Devpost submission. Payments use PayPal **sandbox** accounts, so no real money moves.

## Roles and accounts

| Role | How you get it | What it can do |
|---|---|---|
| Client | Sign up, create a job | Edit the drafted criteria, fund the job with PayPal, appeal a verdict |
| Freelancer | Open the client's invite link, sign up or log in, give a PayPal payout email | Submit a pull request, rerun verification, appeal a verdict |
| Admin | Email listed in `ADMIN_EMAILS` | Release, partially release or refund; decide appeals; answer PayPal disputes |

A job is visible only to its two parties and to admins. The AI never moves money: every release, refund and dispute response is an admin action with an explicit confirmation.

## How PayPal is used

| Capability | API | Where |
|---|---|---|
| Hold client funds | Orders v2 `intent=AUTHORIZE` → authorize | `src/server/paypal/payments.ts` |
| Full / partial release | Payments v2 capture with `final_capture` | `src/server/paypal/payments.ts` |
| Reject / cancel | Void authorization | `src/server/paypal/payments.ts` |
| Pay the freelancer | Payouts v1 | `src/server/paypal/payouts.ts` |
| Dispute response | Disputes v1 provide-evidence / accept-claim | `src/server/paypal/disputes.ts` |
| Real-time events | Webhooks + signature verification | `src/app/api/webhooks/paypal/route.ts` |
| Agent investigation | **PayPal MCP server** (read-only tools) | `src/server/paypal/mcp.ts` |

## How AI is used
- An LLM, called through the Vercel AI SDK, drafts acceptance criteria, verifies delivered work, and drafts appeal rulings and dispute evidence. **The provider is pluggable:** set `AI_PROVIDER=google` (Gemini, the default) or `AI_PROVIDER=anthropic` (Claude), and optionally `AI_MODEL`. See [ADR 0003](docs/decisions/0003-pluggable-ai-provider.md).
- The model never decides money on its own. CI results are judged in code, the overall verdict is computed in code, and anything uncertain or below the confidence floor goes to an admin.
- The dispute copilot is an agent that calls PayPal's official MCP server to look up orders, disputes, transactions and shipment tracking. **It cannot move money.** See [ADR 0002](docs/decisions/0002-paypal-mcp-for-agent-tools.md).
  - It drafts either an evidence package (what was agreed, the PR, CI and verification results, the release date from the audit trail) or an accept-claim note. The draft is checked in code: notes are capped at PayPal's 2000 characters, and an empty contest falls back to accepting.
  - The admin edits and submits it at `/admin/disputes`. The submit checks which actions PayPal currently allows on that dispute.
  - Disputes arrive by webhook, or by **Sync from PayPal** when no public URL exists (local dev). Drafting runs in the background because a slow model can take minutes. The MCP investigation has a 2-minute budget; without it, the draft uses platform records only.

## Project structure

```
.
├── docs/
│   ├── architecture.md         # Components, flows, trust boundaries
│   ├── sandbox-setup.md        # PayPal sandbox accounts, webhook, spikes
│   └── decisions/              # Architecture decision records (ADRs)
├── scripts/
│   ├── seed-demo.ts            # Create or reset the demo admin account
│   ├── register-webhook.ts     # Register the PayPal webhook for a deployed URL
│   └── spikes/                 # Runnable sandbox experiments (day 1–2)
├── src/
│   ├── app/                    # Next.js App Router: pages + API route handlers
│   │   └── api/                # health, PayPal webhooks
│   ├── config/                 # Validated environment variables
│   └── server/                 # Server-only domain code
│       ├── ai/                 # Model selection, criteria generator, verifier, appeal and dispute drafts
│       ├── auth/               # Accounts, sessions, invite links, who-may-do-what policy
│       ├── db/                 # Drizzle schema + client
│       ├── disputes/           # PayPal dispute sync, copilot draft, response
│       ├── escrow/             # Money math + job state machine (pure, unit-tested)
│       ├── github/             # Pull-request evidence snapshot
│       ├── jobs/               # Job lifecycle: create, fund, verify, settle, appeals, hold renewal
│       └── paypal/             # REST client, payments, payouts, disputes, webhooks, MCP
└── tests/
    └── unit/                   # Vitest unit tests
```

UI lives in `src/app/jobs/` (client and freelancer), `src/app/admin/` (queue, settlement, disputes), and `src/app/login`, `signup`, `invite/[token]`, `account` (accounts).

## Getting started

Requirements: Node 20+, Docker (for Postgres), a PayPal developer account.

```bash
npm install
cp .env.example .env          # then fill in the values, see docs/sandbox-setup.md
docker compose up -d db       # local Postgres
npm run db:generate && npm run db:migrate

npm run spike:token           # check PayPal credentials
npm run spike:escrow          # authorize → partial capture → payout in the sandbox
npm run seed:demo             # optional: demo admin (needs DEMO_ADMIN_PASSWORD and ADMIN_EMAILS)
npm run dev                   # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
|---|---|
| `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal REST app (sandbox) |
| `PAYPAL_WEBHOOK_ID` | Webhook to verify signatures against; get it from `npm run paypal:webhook -- <public url>` |
| `AI_PROVIDER`, `AI_MODEL` | `google` (default) or `anthropic`, and an optional model id |
| `GOOGLE_GENERATIVE_AI_API_KEY` / `ANTHROPIC_API_KEY` | Key for the chosen provider |
| `GITHUB_TOKEN` | Optional; raises the GitHub rate limit. Delivered work must be a PR on a **public** repository |
| `DATABASE_URL` | Postgres |
| `APP_BASE_URL` | Public URL of the app (PayPal redirects back to it). Defaults to Render's URL or `http://localhost:3000` |
| `AUTH_SECRET` | 32+ characters; keys invite links and sign-up IP hashes. Required in production |
| `ADMIN_EMAILS` | Comma-separated emails that get the admin role |
| `DEMO_ADMIN_PASSWORD` | Password `npm run seed:demo` sets for `admin@demo.dev` (which must also be in `ADMIN_EMAILS`) |
| `JOBS_PER_DAY`, `SIGNUPS_PER_IP_PER_HOUR` | Abuse limits for the public demo (defaults 5 and 3); each job costs an AI call |

Deploying: `render.yaml` is a Render Blueprint (one web service, one Postgres). After the first deploy, run `npm run paypal:webhook -- <url>`, set `PAYPAL_WEBHOOK_ID`, then `npm run seed:demo` from the Render shell.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `npm run seed:demo` | Create or reset the demo admin account |
| `npm run paypal:webhook -- <url>` | Register (or find) the PayPal webhook for a deployed URL and print its id |
| `npm run spike:verify -- <PR url> "<brief>"` | Draft criteria and verify a real PR with the configured model (no money, no DB) |
| `npm run spike:token` | Check sandbox credentials + Disputes API access |
| `npm run spike:escrow [-- --void \| --full]` | Run the escrow money path end-to-end in the sandbox |

## Security
- Secrets come only from environment variables; `.env` is gitignored.
- Webhooks are verified with PayPal's signature API before anything is trusted, and each event id is processed once.
- Every money-moving call sends a stable `PayPal-Request-Id`, so retries are idempotent.
- The AI drafts, and an admin approves. Money-moving actions are never exposed to the model.
- Delivered work (PR content) and appeal text are treated as untrusted input to the model.
- Accounts: passwords are hashed with scrypt; sessions are random tokens stored hashed, in an httpOnly cookie. Every job action checks that the signed-in user is a party to that job (or an admin) before anything else runs.
- Admin is a role derived from `ADMIN_EMAILS` on every request, and every money decision needs an explicit confirmation.
- Invite links are an HMAC of the job id under `AUTH_SECRET`; accepting a job requires the signed link, not just the job id.
- The public demo is rate-limited (sign-ups per IP, jobs per day) because each job costs an AI call.

## Limitations and next steps
- Delivered work must be a pull request on a public GitHub repository (fine-grained tokens can't read Checks on private ones).
- Holding client funds for third parties needs licensing in production; here PayPal's authorization hold (up to 29 days, renewed after day 3) stands in for it, in the sandbox only.
- Invite links don't expire, and there is no email verification or password reset.
- A PayPal hold that expires ends the job; the client has to create and fund a new one.
