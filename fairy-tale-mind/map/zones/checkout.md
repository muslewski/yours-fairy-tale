---
type: zone
summary: "Mock Stripe checkout — looks and behaves like Stripe but makes no network calls and charges nothing."
tags: [ui, checkout]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[configurator]]"]
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "components/checkout/*"
depends: []
invariants:
  - rule: "Never makes network calls or charges money — simulation only."
    enforcedBy: []
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
A fully client-side mock of the Stripe Checkout experience.
Triggered from `[[configurator]]` after the user completes personalisation.
No real payment processing occurs; this is a UI simulation for demos and previews.

## Lineage
Seeded from the existing site at Mind setup.
