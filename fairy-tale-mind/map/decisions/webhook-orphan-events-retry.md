---
type: decision
summary: "Stripe charge.refunded / charge.dispute.created events with no matching order now THROW (→ 500 → Stripe retries with backoff) instead of being silently dropped — out-of-order delivery safety. Accepted failure mode: a permanently-orphaned event retries noisily for ~3 days, then shows as a failed webhook; benign, do not page."
tags: [stripe, webhook, reliability]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[checkout]]", "[[stripe-webhook-checkout-gated-accounts]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
Stripe does not guarantee event ordering: a `charge.refunded` or
`charge.dispute.created` can arrive BEFORE the `checkout.session.completed` that
creates the order. The old handler logged a warning and returned 200 on "no order
found for payment_intent" — which acknowledged the event, permanently dropping the
refund/dispute and leaving the order stuck at "paid". With real money at launch,
that is a silent financial-state corruption.

## Decision
When the lookup by `stripePaymentIntentId` finds no order, `handleStripeEvent`
**throws** → the route returns 500 → Stripe retries with exponential backoff for up
to ~3 days. By then the `checkout.session.completed` for a genuinely out-of-order
pair has long since created the order, and a retry succeeds. Events that carry no
`payment_intent` at all (can never match) remain warn-and-return.

The alternative — persist orphan events in a table and reconcile when the order
appears — was rejected at this scale.

## Why
- **Throw-for-retry needs zero new infrastructure**: no orphan-events table, no
  reconciliation job, no second code path to test. Stripe's retry queue IS the
  persistence.
- The out-of-order window is seconds; Stripe's backoff window is days. The retry
  mechanism covers the real case with enormous margin.
- Persist-and-reconcile earns its complexity only at volumes where webhook 500s are
  operationally noisy or where events must be processed exactly-once across many
  types. This MVP has two affected event types and low volume.

## Consequences
- **Accepted failure mode (documented in the route header for on-call):** an event
  that will NEVER match — e.g. a refund for an unrelated or pre-launch charge in
  the same Stripe account — retries for the full ~3-day backoff window, logging
  "no order yet" on each attempt, then surfaces as a failed webhook in the Stripe
  dashboard. This is benign and self-resolving; do not page on it. Investigate only
  if the payment_intent should have a real order.
- Covered in `tests/stripe/webhook.test.ts` (orphan refund/dispute throws; missing
  payment_intent returns quietly).
