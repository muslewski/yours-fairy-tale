---
type: zone
summary: "The personalized video builder — the homepage's conversion centerpiece (#build)."
tags: [surface, conversion]
status: active
created: 2026-06-02
updated: 2026-06-24
related: ["[[checkout]]", "[[payload-backend]]", "[[2026-06-16-photos-before-checkout-association]]", "[[2026-06-23-pricing-in-payload-global]]", "[[2026-06-24-sitemedia-via-upload-relationship]]"]
sources: []
owns:
  routes: []
  anchors: ["id:build"]
  globs:
    - "components/home/configurator/**"
    - "app/(site)/api/configurator/**"
    - "lib/pricing.ts"
    - "lib/pricing-source.ts"
    - "lib/worlds.ts"
    - "tests/lib/pricing.test.ts"
    - "tests/lib/pricing-source.test.ts"
depends: ["[[checkout]]"]
invariants:
  - rule: "Editable prices live in the Payload `pricing` Global; lib/pricing.ts holds DEFAULT_PRICING (the code fallback) + the math. The configurator receives the resolved pricing as a PROP (getPricing() server-side, via app/(site)/page.tsx) — it never re-declares or value-imports LENGTHS/DETAILS/ADDONS, only types + summarizeSelections."
    enforcedBy: ["tests/lib/pricing.test.ts", "tests/lib/pricing-source.test.ts", "tests/stripe/checkout.test.ts"]
  - rule: "The displayed total === computeTotalCents(selections, pricing) / 100 — client display and server charge use the same math over the same resolved pricing."
    enforcedBy: ["tests/lib/pricing.test.ts"]
  - rule: "The CTA POSTs SELECTIONS (childName, world, length, detail, extraMinutes, addOns, plotNote) plus assetPaths (blob pathnames of photos uploaded in step 3) to /api/stripe/checkout and redirects to the returned Stripe url — it never sends a price and never opens the mock checkout."
    enforcedBy: ["e2e/checkout.spec.ts"]
  - rule: "World ids match collections/Orders.ts world options and lib/worlds.ts WORLD_LABELS; childName is optional (empty is allowed, parent adds it later)."
    enforcedBy: []
  - rule: "Each detail level may carry an optional admin-editable preview image (upload→site-media, resolved server-side to its public .url via getPricing() at depth:1), title, and description — DISPLAY-ONLY: they never reach computeTotalCents/summarizeSelections/the Stripe charge. All three are optional; DetailPreview returns null and the resolver still falls back to DEFAULT_PRICING when they (or the whole details array) are absent, so an unseeded tier never white-screens."
    enforcedBy: ["tests/lib/pricing.test.ts", "tests/lib/pricing-source.test.ts"]
verifiedAt: 984fd81
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

## Pricing model (admin-editable, code fallback)
Editable prices live in the Payload **`pricing` Global** (`globals/Pricing.ts`, owned by
`[[payload-backend]]`). `lib/pricing.ts` now holds the `Pricing` type, `DEFAULT_PRICING`
(the code fallback, kept in sync with live values), and the math —
`computeTotalCents(sel, pricing = DEFAULT_PRICING)` + `summarizeSelections(sel, pricing)`;
the legacy `LENGTHS/DETAILS/ADDONS/EXTRA_MINUTE_PRICE/MAX_EXTRA_MINUTES` exports remain as
views onto `DEFAULT_PRICING` for any non-configurator importer.

`lib/pricing-source.ts` `getPricing()` reads the global server-side (cached via
`unstable_cache`, tag `"pricing"`; the global's `afterChange` calls
`revalidateTag("pricing")`) and falls back to `DEFAULT_PRICING` if the global is
unseeded/empty or the read throws — so a DB hiccup never breaks the page or the charge.
The homepage server component (`app/(site)/page.tsx`) calls `getPricing()` and passes the
resolved `pricing` down as a prop; the configurator and its leaves consume it (no value
imports). The checkout route reads the same `getPricing()` for the authoritative charge —
so the number shown is the number paid. Story worlds live in `lib/worlds.ts`
(`WORLD_LABELS`, shared with the customer dashboard).

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
Add-on change (2026-06-19): the digital "4K master file" ($50) add-on became a "Physical DVD"
keepsake ($25). The internal add-on id stays `master` (existing orders' `addOns` keep
resolving); only label/note/price changed in `lib/pricing.ts`, plus the FAQ copy. A physical
DVD needs a mailing address but checkout collects none yet — see
`[[dvd-add-on-no-shipping-address]]`.
Reprice (2026-06-23): tier base prices Short/Medium/Long → $180/$290/$580,
`EXTRA_MINUTE_PRICE` → $55, all detail multipliers flattened to ×1.0 (detail
level adds no surcharge for now), and digital add-ons narration/music → $10 each
(DVD stays $25). Values-only change in `lib/pricing.ts`; the multiplier-driven UI
self-corrects (caption shows "Base price", the surcharge line stops rendering).
Admin-editable pricing landed (2026-06-23): a Payload `pricing` Global now drives the
configurator (props) and the authoritative charge (`getPricing()`), with `DEFAULT_PRICING`
as the fallback. The configurator no longer value-imports from `lib/pricing.ts`. See
`[[2026-06-23-pricing-in-payload-global]]`. (The `pricing` table migration reached prod
automatically on deploy via `instrumentation.ts` — see `[[migrate-on-deploy-via-instrumentation]]`;
prod stays on `DEFAULT_PRICING` until the global is seeded.)
Detail-tier previews landed (2026-06-24, branch `feat/detail-tier-previews`): each
detail level gained an optional admin-editable preview image (Payload `upload`→
`site-media`), title, and description on `pricing.details[]`, resolved server-side by
`getPricing()` at `depth:1` to a public `.url` and shown in a new `DetailPreview` panel
(`components/home/configurator/detail-preview.tsx`) below the "Detail level" control.
Display-only (no effect on the charge); first repo use of rendering a `site-media` asset
through a relationship + public `.url`. See `[[2026-06-24-sitemedia-via-upload-relationship]]`.
Shipped to prod 2026-06-24: merged to `main` + deployed; the `pricing_details` migration
auto-applied on boot, and the `pricing` global was seeded (full DEFAULT_PRICING values + the
three detail previews wired to their `site-media` images) directly via SQL, then verified
live on yoursfairytale.com (basic/detailed/premium images + titles render). Open minor: the
seed used a direct SQL write (not an admin save), and `payload-types.ts` is not yet
regenerated (cosmetic — the resolver casts around the generated type).
Sticky price rail (2026-06-24): the preview panel made the form tall enough to scroll the
running total out of view, so the rail content is now `lg:sticky lg:top-24` (matches
`scroll-padding-top: 6rem`) inside a full-height yellow column. Required dropping
`overflow-hidden` on the `#build` section and the card grid (it traps `position: sticky`)
and moving the card's corner-clipping onto the rail's own rounded corners. Verified live
(sticky engages + holds; corners clean).
