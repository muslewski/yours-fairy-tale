---
type: debt
summary: "map/product.md still frames the product as a prototype with a simulated checkout ('the checkout is a simulation; not a live business yet') — false since the 2026-06-19 go-live to real Stripe payments."
tags: [docs, product, stripe]
status: open
created: 2026-06-19
updated: 2026-06-19
related: ["[[checkout]]", "[[configurator]]", "[[stripe-go-live]]", "[[checkout-is-a-simulation]]"]
sources: []
severity: medium
effort: low
---

## Problem
`fairy-tale-mind/map/product.md` — the north-star brief read by every future agent — still
says:
- step 4 "Check out": *"the checkout looks and behaves like Stripe embedded checkout but is
  a simulation: no network calls, no charges."*
- "Reality for future agents": *"Design-forward, not a live business yet. … the checkout is
  a simulation; the configurator collects no payment. Treat it as a polished product
  prototype."*

Both are now wrong. The live configurator POSTs to the real `POST /api/stripe/checkout` and
redirects to Stripe-hosted Checkout, and as of 2026-06-19 Production runs in Stripe LIVE
mode taking real money (`[[stripe-go-live]]`). The "simulation" framing only ever applied to
the unused mock UI in `components/checkout/*`, which is no longer on the live flow.

(Note: this drift predates go-live — the configurator was already wired to the real route —
but go-live makes the "not a live business yet" line actively misleading.)

## Fix
Update `map/product.md`: reframe step 4 as real Stripe-hosted Checkout, and rewrite the
"Reality for future agents" bullet to say payments are live (keep the mock UI note scoped to
`components/checkout/*`). Cross-link `[[stripe-go-live]]`. Consider whether
`[[checkout-is-a-simulation]]` should be tombstoned/superseded too.
