---
type: zone
summary: "The personalized video builder — the homepage's conversion centerpiece (#build)."
tags: [surface, conversion]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[checkout]]"]
sources: []
owns:
  routes: []
  anchors: ["id:build"]
  globs:
    - "components/home/configurator.tsx"
    - "lib/pricing.ts"
    - "lib/worlds.ts"
    - "tests/lib/pricing.test.ts"
depends: ["[[checkout]]"]
invariants:
  - rule: "Prices live ONLY in lib/pricing.ts — the configurator imports them; it never re-declares LENGTHS/DETAILS/ADDONS. Same module is the server's authoritative price source."
    enforcedBy: ["tests/lib/pricing.test.ts", "tests/stripe/checkout.test.ts"]
  - rule: "The displayed total === computeTotalCents(selections) / 100 — client display and server charge use the same math."
    enforcedBy: ["tests/lib/pricing.test.ts"]
  - rule: "The CTA POSTs SELECTIONS (childName, world, length, detail, extraMinutes, addOns) to /api/stripe/checkout and redirects to the returned Stripe url — it never sends a price and never opens the mock checkout."
    enforcedBy: []
  - rule: "World ids match collections/Orders.ts world options and lib/worlds.ts WORLD_LABELS; childName is optional (empty is allowed, parent adds it later)."
    enforcedBy: []
verifiedAt: cd8fe918598831c5be64121fc979a0511a5fb39b
---

## Purpose
The `#build` section of the homepage — a step-by-step form where parents personalise
their child's video: child's first name, plot/world, length, extra minutes, detail level,
and add-ons. It is the primary conversion point on the marketing site and feeds into
`[[checkout]]`.

## Pricing model (shared)
All prices live in `lib/pricing.ts` (the single source of truth): `LENGTHS`, `DETAILS`,
`ADDONS`, `EXTRA_MINUTE_PRICE`, `MAX_EXTRA_MINUTES`, plus `computeTotalCents(selections)`
(authoritative amount, in cents) and `summarizeSelections()` (the Stripe line-item
description). The configurator imports these for display; the checkout route imports the
same `computeTotalCents` to charge — so the number shown is the number paid. Story worlds
live in `lib/worlds.ts` (`WORLD_LABELS`, shared with the customer dashboard).

## Checkout wiring
"Create their video" POSTs the SELECTIONS to `POST /api/stripe/checkout` and redirects the
buyer to the returned Stripe-hosted Checkout url. Pending/error states are shown inline.
The mock `<Checkout>` (`components/checkout/*`) is no longer used in the live flow (left in
place as a demo).

## Anchors & layout
Anchor: `id:build` (the section element in `components/home/configurator.tsx`).

## Lineage
Seeded from the existing site at Mind setup.
Pricing extracted to `lib/pricing.ts` + worlds to `lib/worlds.ts`; child-name and plot
inputs added; CTA wired to real server-priced Stripe Checkout (2026-06-03).
