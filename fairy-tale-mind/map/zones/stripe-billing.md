---
type: zone
summary: "Stripe integration — Checkout Session creation, webhook handler (account creation, order creation, refund/dispute sync), and pricing config. No public sign-up: all customer accounts originate from the webhook. lib/stripe.ts + lib/checkout.ts + lib/pricing.ts + app/api/stripe/."
tags: [stripe, billing, checkout, webhook, refund, pricing]
status: seeded
created: 2026-06-23
updated: 2026-06-23
verifiedAt: unverified
owns:
  globs:
    - "lib/stripe.ts"
    - "lib/checkout.ts"
    - "lib/pricing.ts"
    - "app/api/stripe/**"
depends:
  - "[[checkout]]"
  - "[[order-lifecycle]]"
  - "[[payload-backend]]"
---

## What this is

Stripe is the sole payment processor. The configurator builds a Checkout Session (lib/checkout.ts) and redirects to Stripe-hosted checkout. On success, Stripe fires a webhook (app/api/stripe/) that creates the customer Better Auth account, the Payload Order record, sends a confirmation email, and handles refund/dispute status sync back to the order. Pricing options (world, format, add-ons) are centralized in lib/pricing.ts and lib/variants.ts.

## Key files

- `lib/stripe.ts` — Stripe SDK singleton
- `lib/checkout.ts` — Checkout Session builder
- `lib/pricing.ts` — product pricing config
- `lib/variants.ts` — product variant definitions
- `app/api/stripe/` — webhook endpoint (checkout.session.completed, refund, dispute events)
