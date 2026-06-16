---
type: zone
summary: "The personalized video builder — the homepage's conversion centerpiece (#build)."
tags: [surface, conversion]
status: active
created: 2026-06-02
updated: 2026-06-16
related: ["[[checkout]]", "[[2026-06-16-photos-before-checkout-association]]"]
sources: []
owns:
  routes: []
  anchors: ["id:build"]
  globs:
    - "components/home/configurator/**"
    - "app/(site)/api/configurator/**"
    - "lib/pricing.ts"
    - "lib/worlds.ts"
    - "tests/lib/pricing.test.ts"
depends: ["[[checkout]]"]
invariants:
  - rule: "Prices live ONLY in lib/pricing.ts — the configurator imports them; it never re-declares LENGTHS/DETAILS/ADDONS. Same module is the server's authoritative price source."
    enforcedBy: ["tests/lib/pricing.test.ts", "tests/stripe/checkout.test.ts"]
  - rule: "The displayed total === computeTotalCents(selections) / 100 — client display and server charge use the same math."
    enforcedBy: ["tests/lib/pricing.test.ts"]
  - rule: "The CTA POSTs SELECTIONS (childName, world, length, detail, extraMinutes, addOns, plotNote) plus assetPaths (blob pathnames of photos uploaded in step 3) to /api/stripe/checkout and redirects to the returned Stripe url — it never sends a price and never opens the mock checkout."
    enforcedBy: ["e2e/checkout.spec.ts"]
  - rule: "World ids match collections/Orders.ts world options and lib/worlds.ts WORLD_LABELS; childName is optional (empty is allowed, parent adds it later)."
    enforcedBy: []
verifiedAt: 2a1e55a
---

## Purpose
The `#build` section of the homepage — a **3-step wizard** where parents personalise their
child's video. It is the primary conversion point on the marketing site and feeds into
`[[checkout]]`. The steps:
1. **The film** — length, extra minutes, detail level, add-ons (the pricing controls).
2. **The story** — plot/world, an optional free-text plot idea, and the child's first name.
3. **Photos & checkout** — a real photo dropzone that uploads each picked photo
   browser→Vercel Blob (anonymous `clientUploads` via `app/(site)/api/configurator/blob-upload`,
   reusing the `prepareForUpload` re-encode, capped at `MAX_CHECKOUT_PHOTOS`=6), then the
   checkout CTA. The blob pathnames ride to the webhook in Stripe metadata and become the
   order's photos (see `[[2026-06-16-photos-before-checkout-association]]`). The dashboard
   uploader in `[[payload-backend]]` remains for adding/replacing photos later.

The wizard is one client component (`components/home/configurator/index.tsx`) holding all
selection + `step` state; step content swaps in the left panel via `AnimatePresence` (guarded
by `useReducedMotion`) while the price rail stays mounted. The rail's primary button reads
"Continue →" on steps 1–2 (advances) and "Create their video →" on step 3 (checks out).
Files are split under `components/home/configurator/`: `index.tsx` (shell), `step-*.tsx`,
`step-nav.tsx`, and the shared controls (`segmented`, `range-slider`, `world-picker`,
`price-rail`, `photo-dropzone`). Only `index.tsx` carries `"use client"` — the leaves are
imported into its client boundary, so a redundant directive would trip Next 16 warning 71007.

## Pricing model (shared)
All prices live in `lib/pricing.ts` (the single source of truth): `LENGTHS`, `DETAILS`,
`ADDONS`, `EXTRA_MINUTE_PRICE`, `MAX_EXTRA_MINUTES`, plus `computeTotalCents(selections)`
(authoritative amount, in cents) and `summarizeSelections()` (the Stripe line-item
description). The configurator imports these for display; the checkout route imports the
same `computeTotalCents` to charge — so the number shown is the number paid. Story worlds
live in `lib/worlds.ts` (`WORLD_LABELS`, shared with the customer dashboard).

## Checkout wiring
On step 3, "Create their video" POSTs the SELECTIONS to `POST /api/stripe/checkout` and
redirects the buyer to the returned Stripe-hosted Checkout url. Pending/error states are shown
inline (and the checkout error clears when navigating between steps). The POST body now carries
`extraMinutes`, `addOns`, and the free-text `plotNote` in addition to `childName/world/length/
detail`; these ride in Stripe metadata and `[[checkout]]`'s webhook persists them onto the
order. The mock `<Checkout>` (`components/checkout/*`) is not used in the live flow.

## Anchors & layout
Anchor: `id:build` (the `<section>` in `components/home/configurator/index.tsx`).

## Lineage
Seeded from the existing site at Mind setup.
Pricing extracted to `lib/pricing.ts` + worlds to `lib/worlds.ts`; child-name and plot
inputs added; CTA wired to real server-priced Stripe Checkout (2026-06-03).
Restructured into a 3-step wizard + UI-only photo dropzone; `extraMinutes/addOns/plotNote`
now persisted onto the order (2026-06-04, see `[[configurator-wizard]]`).
