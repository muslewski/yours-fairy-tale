---
type: zone
summary: "Stripe checkout integration — mock UI simulation + real Checkout Session route + webhook that creates accounts, orders, sends confirmation email, and syncs refund/dispute status."
tags: [ui, checkout, stripe, api, webhook, orders]
status: active
created: 2026-06-02
updated: 2026-06-03
related: ["[[configurator]]", "[[payload-backend]]"]
sources: ["[[checkout-is-a-simulation]]", "[[payments-stripe-over-shopify]]", "[[stripe-checkout-session-route]]"]
owns:
  routes:
    - "/api/stripe/checkout"
    - "/api/stripe/webhook"
  anchors: []
  globs:
    - "components/checkout/*"
    - "lib/stripe.ts"
    - "lib/checkout.ts"
    - "lib/email.ts"
    - "lib/order-status-email.ts"
    - "app/api/stripe/checkout/route.ts"
    - "app/api/stripe/webhook/route.ts"
    - "collections/Orders.ts"
    - "tests/stripe/checkout.test.ts"
    - "tests/stripe/webhook.test.ts"
    - "tests/stripe/refund-email.test.ts"
    - "tests/app/status-emails.test.ts"
depends: ["[[payload-backend]]"]
invariants:
  - rule: "Never makes network calls or charges money — simulation only."
    enforcedBy: []
  - rule: "STRIPE_SECRET_KEY must be set; singleton throws at boot if missing."
    enforcedBy: ["lib/stripe.ts"]
  - rule: "buildCheckoutSessionParams is pure — no network calls, safe to unit-test."
    enforcedBy: ["tests/stripe/checkout.test.ts"]
  - rule: "Session metadata must carry all four config fields: childName, world, length, detailLevel."
    enforcedBy: ["tests/stripe/checkout.test.ts"]
  - rule: "success_url must include the {CHECKOUT_SESSION_ID} Stripe template literal."
    enforcedBy: ["tests/stripe/checkout.test.ts"]
  - rule: "Webhook reads STRIPE_WEBHOOK_SECRET lazily inside POST (not at module top) so importing in dev with empty env doesn't throw."
    enforcedBy: ["app/api/stripe/webhook/route.ts"]
  - rule: "Webhook is idempotent on stripeSessionId — duplicate events create no second order."
    enforcedBy: ["tests/stripe/webhook.test.ts"]
  - rule: "User upsert by email — never creates a duplicate users row; emailVerified:true on new users (payment proves email ownership)."
    enforcedBy: ["tests/stripe/webhook.test.ts"]
  - rule: "No public sign-up path exists — customer accounts come ONLY from this webhook."
    enforcedBy: []
  - rule: "Confirmation email failure never blocks order creation — errors are logged, not thrown."
    enforcedBy: ["tests/stripe/refund-email.test.ts"]
  - rule: "Dev email always routes to RESEND_TO_OVERRIDE when set; subject prefixed with real recipient."
    enforcedBy: ["tests/stripe/refund-email.test.ts"]
  - rule: "charge.refunded → order status 'refunded'; charge.dispute.created → 'cancelled'. Unknown paymentIntentId: log and return, no throw."
    enforcedBy: ["tests/stripe/refund-email.test.ts"]
  - rule: "stripePaymentIntentId must be indexed for O(1) refund/dispute lookups."
    enforcedBy: ["collections/Orders.ts"]
  - rule: "Status-transition email fires ONLY on update + real status change + proof_ready or delivered. All other transitions (including create) are silent."
    enforcedBy: ["tests/app/status-emails.test.ts"]
  - rule: "Status-transition email failure never blocks the order update — errors are logged, not thrown."
    enforcedBy: ["tests/app/status-emails.test.ts"]
verifiedAt: 1ebff7f4dd8c92fe6fe7c2098dcf142f9eeb7ce6
---

## Purpose
Two-layer checkout:

1. **UI simulation** (`components/checkout/*`) — a fully client-side mock of the
   Stripe Checkout experience. Triggered from `[[configurator]]` after the user
   completes personalisation. No real payment processing; for demos and previews.

2. **Real Stripe Checkout Session route** (`POST /api/stripe/checkout`) — thin Next.js
   route handler that validates the body and delegates all param shaping to the pure
   builder `lib/checkout.ts`. Returns `{ url }` for the client to redirect to.
   A companion webhook (separate task) will consume `checkout.session.completed` and
   create the Customer + Order records using the session `metadata`.

## Key design choices
- `lib/stripe.ts` — SDK singleton; throws at import time if `STRIPE_SECRET_KEY` is absent.
- `lib/checkout.ts` — pure `buildCheckoutSessionParams()` function; no network, fully
  unit-testable (see `[[stripe-checkout-session-route]]` decision).
- Price: placeholder `$49` (`unit_amount: 4900`); overridable via `STRIPE_VIDEO_PRICE_CENTS`
  env var. **TODO: confirm real pricing with product owner before going live.**
- API version pinned to `2026-05-27.dahlia` (latest in stripe@22.2.0).

## Webhook (`POST /api/stripe/webhook`)
Handles three event types via `handleStripeEvent` (exported, HTTP-free, safe to unit-test):

### `checkout.session.completed`
Enacts the "checkout-gated, no public sign-up" model:
1. **Signature verification** — `stripe.webhooks.constructEvent(rawBody, sig, secret)` with
   raw body via `req.text()` (never `req.json()`, which would break the HMAC). Secret read
   lazily inside the handler (not at module top) — returns 500 if missing at request time.
2. **Idempotency** — checks for an existing `orders` row with the same `stripeSessionId`
   before doing any DB work; returns early on duplicate.
3. **Upsert user** — finds `users` by email (from `customer_details.email` or
   `customer_email`); creates one with `emailVerified: true` if absent.
4. **Create order** — links to the user via `owner`, stores `stripeSessionId`,
   `stripePaymentIntentId`, the four metadata fields, and lets `status` default to `"paid"`.
5. **Confirmation email** — sends a "your video is on its way — sign in to track it" email
   via `lib/email.ts` (Resend). Email failure is logged and never re-throws; the order is
   always the critical path.

### `charge.refunded`
Finds the order by `stripePaymentIntentId` (indexed). Sets `status: "refunded"`.
Unknown payment intent: log + return (no throw).

### `charge.dispute.created`
Same lookup. Sets `status: "cancelled"`.
Unknown payment intent: log + return (no throw).

## Email (`lib/email.ts`)
Thin Resend wrapper. Dev routing: if `RESEND_TO_OVERRIDE` is set, all mail goes to that
address with the real recipient prefixed to the subject (`[→ buyer@x.io] subject`).
Guard: if `RESEND_API_KEY` is absent, logs a warning and returns without error.

## Lineage
Seeded from the existing site at Mind setup. Real Stripe route added 2026-06-03.
Webhook (checkout-gated account creation) added 2026-06-03.
Confirmation email + refund/dispute status sync added 2026-06-03.
Status-transition emails (proof_ready, delivered) added via Orders afterChange hook 2026-06-03.
