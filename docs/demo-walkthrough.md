# Try the live demo

The live site runs against the PayPal **sandbox**, so no real money moves.

**Site:** https://proofpay-hux0.onrender.com

You need three sign-ins: a client, a freelancer and the admin. Use two browser windows (one private) so the client and freelancer sessions don't collide.

| Role | Account |
|---|---|
| Client | Sign up with any email |
| Freelancer | Sign up with a second email, through the client's invite link |
| Admin | `admin@demo.dev`; the password is in the Devpost submission |
| PayPal buyer and payout receiver | Two PayPal sandbox **personal** accounts ([how to create them](sandbox-setup.md#2-sandbox-accounts)) |

The public demo is rate-limited: a few sign-ups per IP per hour and a few jobs per account per day.

## A job that passes

1. **Client: create the job.** Sign up, choose **New job**, set an amount between $100 and $500, and paste this brief:

   > Add an exported function ciphertextByteLength(value) to src/app/api/exams/ciphertextShape.ts. It returns the number of bytes the base64 ciphertext decodes to, ignoring a leading MOCK: prefix. Add unit tests for it. All tests must pass in CI.

   The AI drafts four acceptance criteria, tagged **Code** (checked against the diff) or **CI** (checked against the GitHub check runs). You can remove any of them before funding.
2. **Client: fund it.** Click **Fund with PayPal** and approve with the sandbox buyer account. Back on the job page the amount shows as *held by PayPal*: this is an authorization, not a charge.
3. **Client: invite the freelancer.** Copy the invite link from the job page.
4. **Freelancer: accept.** Open the link in the private window, sign up, and enter the email of the sandbox account that should receive the payout.
5. **Freelancer: submit the work.** Paste this pull request: https://github.com/vendrck/RMIT_HNi_Hex_C2/pull/1

   Verification takes 10 to 30 seconds. The verdict card lists every criterion with a reason, the evidence it was judged on, and a confidence.
6. **Admin: release.** Log in as the admin, open the job, and **Settle** at 100%. PayPal captures the hold and pays out to the freelancer.
7. **Check PayPal.** Log in to https://www.sandbox.paypal.com as the receiver. The payment is at the top of the activity list. The sandbox balance total can lag behind the list.

## A job that fails, and an appeal

Create and fund a second job with the same brief, then submit this pull request instead: https://github.com/vendrck/RMIT_HNi_Hex_C2/pull/2

It adds the function but skips the tests, ignores the `MOCK:` prefix and breaks an existing test, so CI is red. The verdict is a rejection that names each failed criterion.

Either party can then **appeal**. The AI drafts a ruling (release, partial release or refund, with a percentage and a rationale) in the background; the admin decides, and the money moves by that percentage.

## A PayPal dispute

1. As the sandbox buyer, open the captured payment at https://www.sandbox.paypal.com and **report a problem**.
2. The dispute reaches ProofPay by webhook. As admin, open **Admin → Disputes**; if it isn't there within a minute, click **Sync from PayPal**.
3. The copilot looks the case up through PayPal's MCP server, combines it with the job's history, and drafts either an evidence package or an accept-claim note.
4. The admin edits the draft and submits it to PayPal.

## If something goes wrong

| What you see | Why | What to do |
|---|---|---|
| "The AI couldn't draft the criteria just now" | The AI provider is busy or rate-limited | Submit the form again; nothing was created |
| "Verification didn't finish" | Same, during verification | Click **Retry verification**. An admin can also choose **Review it manually** |
| The payout doesn't appear in the receiver's account | Sandbox payouts can take a minute; very large amounts can be denied (see [limitations](../README.md#limitations)) | Reload after a minute; use amounts up to $500 |
| First page load takes a while | The service was idle | Wait for it to wake up |
