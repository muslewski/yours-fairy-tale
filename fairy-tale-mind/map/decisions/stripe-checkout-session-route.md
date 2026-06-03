---
type: decision
summary: "Separate the pure params builder (lib/checkout.ts) from the live network call (route handler) so the builder is unit-testable without mocking Stripe."
tags: [checkout, stripe, testing]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[payments-stripe-over-shopify]]"]
sources: []
decided: 2026-06-03
supersededBy: ""
---

## Context
We needed a Stripe Checkout Session creation route (`POST /api/stripe/checkout`).
The task spec required a network-free unit test for the params shape. If all logic lived
inside the route handler, the test would have needed to mock `next/server` and the Stripe
SDK together — higher friction and more brittle.

## Decision
Split into three layers:

1. **`lib/stripe.ts`** — SDK singleton with a boot-time guard on `STRIPE_SECRET_KEY`.
2. **`lib/checkout.ts`** — pure function `buildCheckoutSessionParams(input, baseUrl?)`.
   Returns `Stripe.Checkout.SessionCreateParams` with no side effects. Testable without
   any mock.
3. **`app/api/stripe/checkout/route.ts`** — thin handler: parse body → validate →
   `buildCheckoutSessionParams()` → `stripe.checkout.sessions.create()` → return `{ url }`.
   The live Stripe call is exercised in E2E, not unit tests.

## Why
- Pure builder = zero-mock unit test (no network, no `msw`, no `vi.mock`).
- Thin handler = the route does only I/O; business rules live in a plain function that is
  easy to read and audit.
- Singleton guard = the app crashes early with a clear message if the key is missing,
  rather than failing silently on the first real request.

## Consequences
- The webhook (separate task) can also call `buildCheckoutSessionParams` in tests if it
  ever needs to round-trip metadata shapes.
- The placeholder price (`$49` / `4900` cents) is readable in `lib/checkout.ts` with a
  clear TODO comment. It is overridable via `STRIPE_VIDEO_PRICE_CENTS` env var.
  **Product owner must confirm real pricing before go-live.**
