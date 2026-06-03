---
type: decision
summary: "The Stripe Checkout charge amount is computed server-side from the buyer's selections, never accepted from the client."
tags: [checkout, security, pricing]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]"]
sources: ["[[stripe-checkout-session-route]]"]
decided: 2026-06-03
supersededBy: ""
---

## Context
The homepage configurator (`#build`) lets a parent assemble a video order (length,
extra minutes, detail level, add-ons) and shows a live total. Clicking "Create their
video" now opens a real Stripe-hosted Checkout. The amount must be trustworthy.

## Decision
The client POSTs only the SELECTIONS to `POST /api/stripe/checkout`
(`{ childName, world, length, detail, extraMinutes, addOns }`) — never a price. The
route (via `buildCheckoutSessionParams` → `computeTotalCents` in `lib/pricing.ts`)
recomputes the amount server-side and builds a single `price_data` line item with it.

`lib/pricing.ts` is the single source of truth for prices, imported by BOTH the
configurator (for display) and the server (for the charge), so the number shown always
equals the number paid. Invalid selections make `computeTotalCents` throw, and the route
answers 400.

The old fixed `$49` placeholder (`STRIPE_VIDEO_PRICE_CENTS` ?? 4900) is removed.

## Why
Never trust a client-sent price: a tampered request could otherwise pay $1 for a $2,000
order. Pricing in a shared module keeps client display and server charge in lockstep and
unit-testable (`tests/lib/pricing.test.ts`, `tests/stripe/checkout.test.ts`).

## Product calls noted
- **Empty child name is allowed.** The name is optional-but-encouraged; if blank we send
  an empty string in metadata (the webhook/order already tolerate it, and the dashboard
  falls back to "Your fairy tale"). The parent can add it later.
- The mock `<Checkout>` (`components/checkout/*`) is left in place as a demo but is no
  longer wired into the live configurator flow.
