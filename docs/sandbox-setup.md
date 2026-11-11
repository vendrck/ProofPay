# PayPal sandbox setup

## 1. App credentials
1. Sign in at <https://developer.paypal.com/dashboard/> and switch to **Sandbox**.
2. **Apps & Credentials → Create App** (type: Merchant). This app acts as the **platform** (merchant of record).
3. Copy the **Client ID** and **Secret** into `.env` (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`). The other variables are described in [deployment.md](deployment.md#environment-variables).
4. In the app's features, make sure **Payouts** is enabled. Disputes is available by default.

## 2. Sandbox accounts
Create every account under **Testing Tools → Sandbox Accounts → Create account** (country United States). Accounts made with "Sign Up" on sandbox.paypal.com never get a confirmed email, and payouts to them stay **Unclaimed**. You need:

| Role | Type | Used for |
|---|---|---|
| Platform | Business (default one linked to your app) | Receives captures, sends payouts |
| Client | Personal | Approves payments, opens disputes |
| Freelancer | Personal (create a second one) | Receives payouts. In the app, this is the payout email the freelancer types when accepting an invite; for the spike script it is `SPIKE_FREELANCER_EMAIL` |

Payouts are always sent from the app's own Business account. If `SPIKE_FREELANCER_EMAIL` is that same account, PayPal returns **Denied** (it can't pay itself). If the receiver's account is in another country or currency, the payout can show **Unclaimed** until the receiver logs in and accepts it.

The platform account's balance has to cover PayPal's fee on each capture, because the freelancer is paid the full captured amount. Raise it from the account's settings in the developer dashboard before testing large amounts.

Log in as any of them at <https://www.sandbox.paypal.com>.

## 3. Check credentials
```bash
npm run spike:token
```

## 4. Escrow money path
```bash
npm run spike:escrow            # authorize $100 → capture $60 (final) → payout $60
npm run spike:escrow -- --void  # authorize → void
npm run spike:escrow -- --full  # authorize → capture $100 → payout
```
Open the printed link, log in as the **client** account and approve. You'll be sent to example.com; that's expected. Then press Enter in the terminal.

What you should see: the client is charged $60, not $100; the platform receives $60; and the freelancer receives a $60 payout.

## 5. Webhooks (needs a public URL)
1. Have a public URL: a deployment, or a tunnel to the dev server (`cloudflared tunnel --url http://localhost:3000`, or ngrok).
2. Register the webhook: `npm run paypal:webhook -- https://<public url>`. It subscribes to the event types in `HANDLED_EVENT_TYPES` (`src/server/paypal/webhooks.ts`), or finds the existing webhook for that URL, and prints its id.
3. Copy the id into `PAYPAL_WEBHOOK_ID`.
4. Test: the **Webhooks simulator** in the developer dashboard sends signed sample events. Real events come from using the app.

Without a public URL, the disputes page has **Sync from PayPal**, which pulls disputes through the API.

## 6. Disputes
1. Have a completed capture: release a job in the app, or run `npm run spike:escrow -- --full`.
2. Log in to <https://www.sandbox.paypal.com> as the **client**, open the transaction and **report a problem** (for example "item not as described").
3. Confirm the `CUSTOMER.DISPUTE.CREATED` webhook arrives, or click **Sync from PayPal** on the admin disputes page. `npm run spike:inspect` lists disputes straight from the API. A new dispute can take a few minutes to appear there.
4. Sandbox-only helpers in `src/server/paypal/disputes.ts`: `sandboxRequireEvidence` moves the case to the evidence stage, and `sandboxAdjudicate` decides it.
