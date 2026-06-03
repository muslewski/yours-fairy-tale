---
type: zone
summary: "Stripe checkout integration — mock UI simulation + real Checkout Session route + webhook that creates checkout-gated accounts and orders."
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
    - "app/api/stripe/checkout/route.ts"
    - "app/api/stripe/webhook/route.ts"
    - "tests/stripe/checkout.test.ts"
    - "tests/stripe/webhook.test.ts"
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
verifiedAt: 410c1bf6d8af07e4bcd4da0d76f6b0f8c8f6b2d1
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
Handles `checkout.session.completed` to enact the "checkout-gated, no public sign-up" model:

1. **Signature verification** — `stripe.webhooks.constructEvent(rawBody, sig, secret)` with
   raw body via `req.text()` (never `req.json()`, which would break the HMAC). Secret read
   lazily inside the handler (not at module top) — returns 500 if missing at request time.
2. **handleStripeEvent** (exported, HTTP-free) — called after verification; safe to unit-test
   directly. Ignores unknown event types.
3. **Idempotency** — checks for an existing `orders` row with the same `stripeSessionId`
   before doing any DB work; returns early on duplicate.
4. **Upsert user** — finds `users` by email (from `customer_details.email` or
   `customer_email`); creates one with `emailVerified: true` if absent.
5. **Create order** — links to the user via `owner`, stores `stripeSessionId`,
   `stripePaymentIntentId`, the four metadata fields, and lets `status` default to `"paid"`.

## Lineage
Seeded from the existing site at Mind setup. Real Stripe route added 2026-06-03.
Webhook (checkout-gated account creation) added 2026-06-03.
