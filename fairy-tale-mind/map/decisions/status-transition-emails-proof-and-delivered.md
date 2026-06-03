---
type: decision
title: "Email only on proof_ready and delivered; all other transitions are silent"
date: 2026-06-03
status: active
area: checkout
---

## Context

Orders move through nine statuses. Some are studio-internal milestones
(awaiting_assets, in_production, approved). Two are customer-initiated
(revisions, approved). One is emailed at creation time via the Stripe webhook
(paid). Two terminal statuses (refunded, cancelled) are self-explanatory.

The customer cannot act on most of these; emailing every transition would be
noisy and undermine the "calm, warm" brand voice.

## Decision

The Orders afterChange hook emails the owner for exactly two statuses:

- **proof_ready** — the customer is blocked until they review; an email is the
  trigger that brings them back.
- **delivered** — the final "it is done" moment; merits a genuine notification.

All other transitions are intentionally silent:

- `paid` — already covered by the Stripe webhook confirmation email (no double).
- `awaiting_assets`, `in_production` — studio-internal steps; no customer action
  required.
- `revisions`, `approved` — customer-initiated; emailing them about something
  they just did is redundant.
- `refunded`, `cancelled` — handled by Stripe events; context comes from those
  emails.

## Consequences

Customers receive two milestone emails per order on the happy path.
`shouldSendStatusEmail()` is a pure predicate, keeping the hook thin and the
gate independently testable.
