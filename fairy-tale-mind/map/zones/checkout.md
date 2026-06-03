---
type: zone
summary: "Stripe checkout integration — mock UI simulation + real Stripe Checkout Session route and pure params builder."
tags: [ui, checkout, stripe, api]
status: active
created: 2026-06-02
updated: 2026-06-03
related: ["[[configurator]]"]
sources: ["[[checkout-is-a-simulation]]", "[[payments-stripe-over-shopify]]", "[[stripe-checkout-session-route]]"]
owns:
  routes:
    - "/api/stripe/checkout"
  anchors: []
  globs:
    - "components/checkout/*"
    - "lib/stripe.ts"
    - "lib/checkout.ts"
    - "app/api/stripe/checkout/route.ts"
    - "tests/stripe/checkout.test.ts"
depends: []
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
verifiedAt: 975b57d8f6fc8a3e0353932dbf945fe49fa39813
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

## Lineage
Seeded from the existing site at Mind setup. Real Stripe route added 2026-06-03.
