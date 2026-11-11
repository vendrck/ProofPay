# ProofPay

**Escrow for freelance software work. AI verifies the delivery; PayPal holds and releases the money.**

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

| | |
|---|---|
| **Demo video (3 min)** | https://youtu.be/_k0BpKM-qyk |
| **Live demo (PayPal sandbox)** | https://proofpay-hux0.onrender.com |
| **Try it yourself** | [docs/demo-walkthrough.md](docs/demo-walkthrough.md): accounts, a ready-made brief and two pull requests, one that passes and one that fails |

## The problem

Freelancers do the work and don't get paid. Clients pay and get work that doesn't do what was asked. Escrow helps, but someone still has to decide whether the work is done, and that judgement is slow, subjective and easy to argue about.

## What ProofPay does

1. **Agree.** The client describes the job in plain language. AI turns the brief into acceptance criteria that can each be checked: against the code diff, or against the CI run. The criteria freeze once the job is funded.
2. **Fund.** The client pays with PayPal. The payment is *authorized* (held), not captured, so nothing is charged yet.
3. **Verify.** The freelancer submits a GitHub pull request. AI checks it against every criterion and gives a reason, the evidence and a confidence for each.
4. **Release.** An admin approves. PayPal captures the full amount or part of it, and the freelancer is paid out.
5. **Defend.** A **dispute copilot** drafts rulings for appeals inside the platform (before capture) and evidence for PayPal disputes (after capture), from the job's audit trail. Nothing is submitted until an admin approves.

**The AI drafts, people approve, PayPal moves the money.** No model output moves money by itself.

## Roles

| Role | How you get it | What it can do |
|---|---|---|
| Client | Sign up, create a job | Edit the drafted criteria, fund the job with PayPal, appeal a verdict |
| Freelancer | Open the client's invite link, sign up or log in, give a PayPal payout email | Submit a pull request, rerun verification, appeal a verdict |
| Admin | Email listed in `ADMIN_EMAILS` | Release, partially release or refund; decide appeals; answer PayPal disputes |

A job is visible only to its two parties and to admins.

## How PayPal is used

| Capability | API | Where |
|---|---|---|
| Hold client funds | Orders v2 `intent=AUTHORIZE` → authorize | `src/server/paypal/payments.ts` |
| Full or partial release | Payments v2 capture with `final_capture` | `src/server/paypal/payments.ts` |
| Reject or cancel | Void authorization | `src/server/paypal/payments.ts` |
| Pay the freelancer | Payouts v1 | `src/server/paypal/payouts.ts` |
| Dispute response | Disputes v1 provide-evidence / accept-claim | `src/server/paypal/disputes.ts` |
| Real-time events | Webhooks with signature verification | `src/app/api/webhooks/paypal/route.ts` |
| Agent investigation | **PayPal MCP server**, read-only tools | `src/server/paypal/mcp.ts` |

Why authorize-then-capture: the hold is real and visible in PayPal, a partial capture is a partial release, and a void is a clean refund. See [ADR 0001](docs/decisions/0001-escrow-authorize-then-capture.md).

## How AI is used

- **Four jobs:** drafting acceptance criteria, verifying delivered work, drafting appeal rulings, and drafting dispute responses. All go through the Vercel AI SDK with structured output.
- **Guard rails in code:** CI results are judged in code, the overall verdict is computed in code, and anything uncertain or below the confidence floor goes to an admin. If the AI is unavailable, the job waits with a Retry button and an admin can take it over.
- **Dispute copilot:** an agent that calls PayPal's official MCP server to look up orders, disputes, transactions and shipment tracking. It has five read-only tools and no way to move money. See [ADR 0002](docs/decisions/0002-paypal-mcp-for-agent-tools.md).
- **Pluggable provider:** Gemini (default) or Claude, chosen by environment variable. See [ADR 0003](docs/decisions/0003-pluggable-ai-provider.md).

## Quick start

Requirements: Node 20+, Docker (for Postgres), a PayPal developer account, and a Gemini or Claude API key.

```bash
npm install
cp .env.example .env          # fill in the values: docs/deployment.md and docs/sandbox-setup.md
docker compose up -d db       # local Postgres
npm run db:migrate

npm run spike:token           # check PayPal credentials
npm run seed:demo             # optional: demo admin (needs DEMO_ADMIN_PASSWORD and ADMIN_EMAILS)
npm run dev                   # http://localhost:3000
```

## Documentation

| Document | What it covers |
|---|---|
| [Try the live demo](docs/demo-walkthrough.md) | Step-by-step run of the passing job, the failing job with an appeal, and a PayPal dispute |
| [Architecture](docs/architecture.md) | Components, job lifecycle, money path, the two dispute channels, trust boundaries |
| [Configuration and deployment](docs/deployment.md) | Every environment variable, deploying to Render, problems we hit and their causes |
| [PayPal sandbox setup](docs/sandbox-setup.md) | Sandbox app, test accounts, webhooks, testing disputes |
| [Decision records](docs/decisions/) | Why authorize-then-capture, why the PayPal MCP server, why a pluggable AI provider |

## Project structure

```
.
├── docs/                       # Architecture, setup guides, decision records
├── scripts/
│   ├── seed-demo.ts            # Create or reset the demo admin account
│   ├── register-webhook.ts     # Register the PayPal webhook for a deployed URL
│   └── spikes/                 # Runnable sandbox checks (credentials, escrow path, verifier, models)
├── src/
│   ├── app/                    # Next.js App Router: pages, server actions, API routes
│   │   ├── jobs/               # Client and freelancer UI
│   │   ├── admin/              # Settlement queue and dispute copilot UI
│   │   └── api/                # Health check, PayPal webhooks
│   ├── config/                 # Validated environment variables
│   └── server/                 # Server-only domain code
│       ├── ai/                 # Model selection, criteria generator, verifier, appeal and dispute drafts
│       ├── auth/               # Accounts, sessions, invite links, who-may-do-what policy
│       ├── db/                 # Drizzle schema, client, migrations
│       ├── disputes/           # PayPal dispute sync, copilot draft, response
│       ├── escrow/             # Money math and job state machine (pure, unit-tested)
│       ├── github/             # Pull-request evidence snapshot
│       ├── jobs/               # Job lifecycle: create, fund, verify, settle, appeals, hold renewal
│       └── paypal/             # REST client, payments, payouts, disputes, webhooks, MCP
└── tests/unit/                 # Vitest unit tests
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `npm run seed:demo` | Create or reset the demo admin account |
| `npm run paypal:webhook -- <url>` | Register (or find) the PayPal webhook for a deployed URL and print its id |
| `npm run spike:token` | Check sandbox credentials and Disputes API access |
| `npm run spike:escrow [-- --void \| --full]` | Run the escrow money path end to end in the sandbox |
| `npm run spike:verify -- <PR url> "<brief>"` | Draft criteria and verify a real pull request with the configured model (no money, no database) |
| `npm run spike:models [-- <rounds>]` | Probe which Gemini models answer reliably right now |
| `npm run spike:inspect [-- <payoutBatchId>]` | List recent disputes; explain a payout batch |

## Security

- **Secrets** come only from environment variables; `.env` is gitignored.
- **Webhooks** are verified with PayPal's signature API before anything is trusted, and each event id is processed once.
- **Idempotency:** every money-moving call sends a stable `PayPal-Request-Id`, so retries are safe.
- **The model has no money tools.** It drafts; an admin approves with an explicit confirmation.
- **Untrusted input:** pull request content and appeal text are treated as untrusted when given to the model.
- **Accounts:** passwords are hashed with scrypt; sessions are random tokens stored hashed, in an httpOnly cookie. Every job action first checks that the signed-in user is a party to that job or an admin.
- **Admin** is a role derived from `ADMIN_EMAILS` on every request.
- **Invite links** are an HMAC of the job id under `AUTH_SECRET`; accepting a job requires the signed link, not just the job id.
- **Abuse limits:** the public demo limits sign-ups per IP and jobs per account per day, because each job costs AI calls.

## Limitations

- **Public repositories only.** Delivered work must be a pull request on a public GitHub repository; fine-grained tokens can't read Checks on private ones.
- **Sandbox only.** Holding client funds for third parties needs licensing in production. Here PayPal's authorization hold (up to 29 days, renewed after day 3) stands in for it.
- **Payout funding.** The freelancer is paid the captured amount, while PayPal deducts its fee from the capture, so the platform account must hold enough balance to cover the fee. In testing, payouts of $100 and $200 arrived; a $10,000 one did not, most likely for this reason.
- **Payout confirmation.** A payout counts as sent when PayPal accepts the request. If PayPal denies it afterwards, the job page doesn't show that yet.
- **AI availability.** A busy or rate-limited provider delays criteria drafting and verification. The app reports it and offers a retry; it does not switch models by itself.
- **Accounts.** Invite links don't expire, and there is no email verification or password reset.
- **Expired holds.** A PayPal hold that expires ends the job; the client has to create and fund a new one.
