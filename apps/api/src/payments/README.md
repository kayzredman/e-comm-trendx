# Payments module

Paystack integration for trendMarga — card, Mobile Money (MoMo) and bank checkout
plus webhook ingestion, reconciliation and a small in-process circuit breaker.

## Endpoints

### Public (storefront)

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/v1/payments/init` | Create / resume a payment intent for an order. Body: `{ orderId, channel? }`. Returns `{ reference, authorizationUrl, accessCode, status }`. |
| `GET`  | `/v1/payments/:reference` | Lookup intent status — used by `/checkout/return` polling. |
| `POST` | `/v1/webhooks/paystack` | Paystack webhook receiver (HMAC-SHA512 signed). Raw body verified against `x-paystack-signature`. |

### Admin (`/cms/payments`)

| Method | Path | Roles |
| --- | --- | --- |
| `GET`  | `/cms/payments/stats` | OWNER / MANAGER / ORDER_MANAGER |
| `GET`  | `/cms/payments/config` | OWNER / MANAGER / ORDER_MANAGER |
| `GET`  | `/cms/payments/intents?status=&limit=` | ↑ |
| `GET`  | `/cms/payments/events?reference=&intentId=&limit=` | ↑ |
| `POST` | `/cms/payments/events/:id/replay` | OWNER / MANAGER |
| `POST` | `/cms/payments/reconcile` | OWNER / MANAGER |
| `POST` | `/cms/payments/intents/:id/refund` | OWNER / MANAGER |

## Environment

| Var | Required | Notes |
| --- | --- | --- |
| `PAYSTACK_SECRET_KEY` | yes (for live charges) | `sk_test_*` or `sk_live_*`. Webhook signature is verified with the same key. If unset, online payments are disabled and `/health` reports `auth/paystack` as DOWN. |
| `WEB_APP_URL` | yes | Used to build the Paystack `callback_url` (`${WEB_APP_URL}/checkout/return`). |

## Paystack dashboard setup

1. **Webhook URL** (Settings → API Keys & Webhooks):
   - staging: `https://api-staging-5143.up.railway.app/v1/webhooks/paystack`
   - prod:    `https://<prod-api-domain>/v1/webhooks/paystack`
2. **Callback URL** is sent per-transaction in `init()` — no dashboard config needed.
3. **Test mode** uses `sk_test_*` + Paystack's test cards / MoMo numbers.
4. **Live mode** requires a verified business; ensure MoMo is enabled on the account.

## Circuit breaker

`circuit-breaker.ts` — in-process, per-API-instance:

- **CLOSED → OPEN** after **5 failures within 30 s**.
- **OPEN → HALF_OPEN** after a **60 s** cool-down.
- **HALF_OPEN → CLOSED** on the next success, or back to OPEN on failure.

When OPEN, `/v1/payments/init` returns `503` immediately instead of hammering Paystack.
State is visible at `/cms/payments` (Health strip) and `/cms/payments/config`.

## Reconciler

`payments.reconciler.ts` runs every **5 minutes**:

- Finds intents stuck in `REQUIRES_AUTH` or `PROCESSING` for **> 10 minutes**.
- Calls Paystack `/transaction/verify/:reference` and updates the intent + order.
- Same logic is exposed manually via `POST /cms/payments/reconcile` (the orange
  "Reconcile now" button in the Health strip).

## Webhook replay

Every webhook hit is persisted in `payment_events` with the raw body and HMAC
verification result. The admin "Events" tab lists them; the **Replay** button
re-runs the original event payload through the same handler (idempotent — uses
the event reference as a dedupe key on the intent state machine).

Use replay when:

- An event was processed before a deploy that changed the handler.
- The order side-effects (status, paid_at) need to be re-applied after a manual
  data fix.

## Refunds

Issued via Paystack `/refund`. Full or partial. Settlement is asynchronous —
Paystack sends `refund.processed` (or `refund.failed`) to the same webhook
endpoint hours/days later.

| Step | What happens |
| --- | --- |
| Admin clicks **Refund** on a `SUCCEEDED` intent | UI prompts for amount (default = remaining) + optional reason |
| `POST /cms/payments/intents/:id/refund` | Calls Paystack `/refund`; appends a `refund.requested` row to `payment_events` |
| `refund.processed` webhook arrives | `applyOutcome` bumps `payment_intents.refunded_amount`; when cumulative ≥ charged, flips `orders.payment_status` → `REFUNDED` |
| `refund.failed` webhook | Logged in events; `refunded_amount` unchanged; admin sees the error in the Events tab |

Constraints:

- Refund button only shows when `intent.status === 'SUCCEEDED'` AND remaining > 0.
- Partial refunds accumulate — repeated clicks subtract from the remaining balance.
- Order moves to `REFUNDED` only on **full** refund (sum across all refund events).
- No automatic stock-restore yet (manual via `/cms/orders` if needed).

## Disputes & chargebacks

Paystack notifies via `charge.dispute.create`, `charge.dispute.remind`, `charge.dispute.resolve`.
We never respond to disputes from our API — merchants reply in the Paystack
dashboard. Our role is just to surface and log them.

| Event | Effect on intent |
| --- | --- |
| `charge.dispute.create` | `dispute_status` ← `pending` (or `data.status`); `dispute_updated_at` = now |
| `charge.dispute.remind` | `dispute_status` ← `awaiting-merchant-feedback` |
| `charge.dispute.resolve` | `dispute_status` ← `resolved` / `declined`; if `data.refund_amount > 0` runs `applyRefundOutcome` to keep `refunded_amount` + order status consistent |

Open disputes (status ≠ `resolved|declined`) are counted in
`GET /cms/payments/stats.openDisputes` and shown as a tile + per-row badge on
`/cms/payments`. To respond, click through to the Paystack dashboard.

## Storefront UX

| Path | Behavior |
| --- | --- |
| `/checkout/return?reference=…` | Polls `/v1/payments/:reference` every 1.5 s (max 20 tries, ~30 s). On `SUCCEEDED` redirects to `/orders/:id`. On `FAILED`/`ABANDONED` shows a "Back to order" card. On timeout shows "Still confirming" with the reference. |
| `/orders/:id` | If `paymentMethod ∈ {MOBILE_MONEY, CARD}` and `paymentStatus ≠ PAID`, renders `PaymentRetryBanner` with "Pay with Mobile Money" / "Pay with Card" buttons that call `/v1/payments/init` and redirect to the returned `authorizationUrl`. |

## Common runbook

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `/v1/payments/init` → 503 "Paystack not configured" | `PAYSTACK_SECRET_KEY` missing | Set on the API service. |
| `/v1/payments/init` → 503 "circuit open" | Breaker tripped by 5 recent Paystack failures | Wait 60 s, then check Paystack status; HALF_OPEN auto-probes. |
| Order stuck in `payment_status=PENDING` after charge | Webhook didn't reach us, or hit but failed processing | Open `/cms/payments` → Events tab → find the reference → Replay. Or hit "Reconcile now". |
| Intent shows `SUCCEEDED` but order still `PENDING` | Replay step skipped, or pre-deploy event | Replay the success event. |
| Webhook returns 401 in Paystack dashboard | Body parsed before raw-body verification | Confirm `payments.module.ts` registers the raw-body middleware on `/v1/webhooks/paystack`. |
| Real ₵1 smoke test for prod | Use Paystack live keys + a real MoMo number | `POST /v1/payments/init` with `{ orderId, channel: 'MOBILE_MONEY' }`, complete on phone, check `/cms/payments`. |

## Manual verification (CLI)

```bash
# Lookup an intent by reference (public endpoint)
curl -s https://<api-host>/v1/payments/<reference> | jq

# Trigger reconcile sweep
curl -s -X POST https://<api-host>/cms/payments/reconcile \
  -H "Authorization: Bearer <clerk-jwt>" | jq

# Replay a webhook event
curl -s -X POST https://<api-host>/cms/payments/events/<event-id>/replay \
  -H "Authorization: Bearer <clerk-jwt>" | jq
```

## Files

```
payments.controller.ts   HTTP routes (public + cms)
payments.service.ts      Business logic — intent state machine, webhook handling
payments.reconciler.ts   5-min sweep for stuck intents
paystack.client.ts       Thin Paystack HTTP wrapper (init, verify, signature)
circuit-breaker.ts       In-process breaker around the Paystack client
payments.module.ts       Nest module wiring + raw-body middleware for webhooks
```
