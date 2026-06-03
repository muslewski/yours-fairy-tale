---
type: decision
title: "First photo upload auto-advances awaiting_assets → in_production"
date: 2026-06-03
status: active
tags: [customer-area, orders, workflow]
related: ["[[auth-gating]]"]
---

## Context
A paid order sits at `awaiting_assets` until the parent sends photos of their
child. Once photos arrive, who moves the order to `in_production` — the customer
action, or a studio admin in the Payload panel?

## Decision
The customer action (`uploadOrderAssets` in `lib/order-actions.ts`) advances the
status `awaiting_assets → in_production` itself, on the first successful upload.
Any later upload while already past `awaiting_assets` leaves the status alone.

## Rationale
- The parent sees immediate progress: the timeline moves from "Add your photos"
  to "In the studio" the moment they finish, which is the reassurance the
  dashboard exists to give.
- It signals the studio that assets are in without a manual triage step.
- Admins can still adjust status freely in the Payload panel; this is a nudge
  forward, not a lock. The mutation is owner-checked (`assertOwnsOrder`) so a
  customer can only advance their own order.

## Alternatives considered
- Admin-only status change: a parent who just uploaded would still see
  "Add your photos" until a human flips it, which reads as "nothing happened".
- Advancing on every upload: pointless writes once past `awaiting_assets`, and
  could clobber a status an admin deliberately set.
