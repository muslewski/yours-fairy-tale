---
type: decision
summary: "components/checkout is a mock of Stripe embedded checkout — no network calls, no charges."
tags: [checkout]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[checkout]]"]
sources: []
decided: 2026-06-02
supersededBy: ""
---

## Context
The site includes a visually complete checkout flow that mirrors Stripe's embedded
checkout UI, including form fields, card element layout, and a pay button.

## Decision
Keep checkout as a deliberate front-end simulation. No Stripe SDK is loaded, no
network calls are made, and no charges occur. A "Test mode" ribbon makes this
obvious to anyone interacting with it.

## Why
The product is still in pre-launch / waitlist phase. A fully wired payment backend
would be premature. The mock lets stakeholders and testers experience the full user
journey without any risk of real charges.

## Consequences
When real payments are needed, `components/checkout` must be replaced (or wired)
with an actual Stripe integration. The README in that directory (see
`components/checkout/README.md`) documents the simulation intent and must be kept
accurate.
