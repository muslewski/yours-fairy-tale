---
type: decision
summary: "Detail-tier preview images render an admin-chosen site-media asset through a Payload upload relationship resolved server-side to its public .url — the first use of this pattern in the repo (site-media was previously consumed only via a hardcoded blob URL)."
tags: [configurator, media, payload, public-assets]
status: active
created: 2026-06-24
updated: 2026-06-24
related: ["[[configurator]]", "[[2026-06-23-pricing-in-payload-global]]"]
sources:
  - "fairy-tale-mind/specs/2026-06-24-detail-tier-previews-design.md"
  - "fairy-tale-mind/plans/2026-06-24-detail-tier-previews.md"
decided: 2026-06-24
supersededBy: ""
---

# Detail-tier preview images via a site-media upload relationship

**Date:** 2026-06-24
**Status:** live in prod (merged to `main`, deployed; migration auto-applied on prod boot via `instrumentation.ts` — see [[migrate-on-deploy-via-instrumentation]] — and the `pricing` global seeded with all three detail previews; verified on yoursfairytale.com 2026-06-24). Minor follow-up: `payload-types.ts` not yet regenerated (the resolver casts around the generated type, so this is cosmetic).

## What

Each configurator detail level (`basic`/`detailed`/`premium`) gained an optional
admin-editable **preview image**, **title**, and **description**, added to the
`pricing` Global's `details[]` array (`globals/Pricing.ts`). The image is a
Payload **`upload` relationship to `site-media`**. `getPricing()`
(`lib/pricing-source.ts`) reads the global at `depth: 1` and resolves the upload
to its public `.url`, threading a plain string down with the rest of the
`Pricing` prop. The configurator renders them in a `DetailPreview` panel
(`components/home/configurator/detail-preview.tsx`) below the "Detail level"
control, swapping as the parent changes tier.

## Why these choices

- **Reuse the pricing Global, not a new Global.** Detail tiers already live in
  `pricing.details[]` and are already threaded to the configurator as a prop.
  Adding three fields keeps a single source of truth and one fetch — no second
  global to keep in sync with the tier ids. See `[[2026-06-23-pricing-in-payload-global]]`.
- **`site-media`, not `media`.** `site-media` is public (`read: () => true`,
  `disablePayloadAccessControl: true`), so its resolved `.url` is a direct,
  cacheable CDN URL safe to render on the public homepage. The customer `media`
  collection is `adminOnly` and must go through ownership-checked proxy routes —
  wrong access model for a marketing preview. This is the **first** place the repo
  resolves a site-media asset through a relationship + server-side `.url`;
  previously site-media was only consumed via a hardcoded blob URL
  (`components/home/sample.tsx`).
- **Plain `<img>`, not `next/image`.** `next.config.ts` has no
  `images.remotePatterns`; site-media is already re-encoded to webp and
  size-bounded, so a plain `<img loading="lazy">` avoids a CSP/remote-pattern
  config surface for no quality loss. Matches the repo's existing raw `<video src>`
  precedent for public site-media.
- **All three fields optional; display-only.** They never touch
  `computeTotalCents` / `summarizeSelections` / the Stripe charge. The resolver
  still falls back to `DEFAULT_PRICING` when `details` is empty/unreadable, and
  `DetailPreview` returns null when image+title+description are all absent — an
  unseeded tier never white-screens.
- **`depth: 1` read.** Required so the upload relationship populates to an object
  with `.url`; the resolver handles the `{url}` object / plain-string / null
  shapes defensively.

## Schema

`migrations/20260624_000000_pricing_detail_media.ts` (ADD-only, idempotent,
registered in `migrations/index.ts`): adds `title`/`description` (varchar) and
`image_id` (uuid) to `pricing_details`, with FK `image_id → site_media(id)
ON DELETE SET NULL` (deleting a site-media asset blanks the reference rather than
dropping the tier row).
