/**
 * Register (or find) the PayPal webhook for a deployed ProofPay and print its id,
 * which goes into PAYPAL_WEBHOOK_ID on the server.
 *   npm run paypal:webhook -- https://your-app.onrender.com
 * Safe to re-run: an existing webhook for the same URL is reused, not duplicated.
 */
import { paypalEnv } from "@/config/env";
import { PayPalClient } from "@/server/paypal/client";
import { HANDLED_EVENT_TYPES } from "@/server/paypal/webhooks";

interface Webhook {
  id: string;
  url: string;
  event_types: { name: string }[];
}

async function main() {
  const base = process.argv[2];
  if (!base || !/^https:\/\//.test(base)) throw new Error("Usage: npm run paypal:webhook -- https://your-app.example.com");
  const url = new URL("/api/webhooks/paypal", base).toString();
  const client = new PayPalClient(paypalEnv());

  const { webhooks = [] } = await client.request<{ webhooks?: Webhook[] }>("/v1/notifications/webhooks");
  const existing = webhooks.find((w) => w.url === url);
  if (existing) {
    console.log(`Webhook already registered for ${url}`);
    console.log(`PAYPAL_WEBHOOK_ID=${existing.id}`);
    return;
  }

  const created = await client.request<Webhook>("/v1/notifications/webhooks", {
    method: "POST",
    body: { url, event_types: HANDLED_EVENT_TYPES.map((name) => ({ name })) },
  });
  console.log(`Registered ${url} for ${created.event_types.length} event types`);
  console.log(`PAYPAL_WEBHOOK_ID=${created.id}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
