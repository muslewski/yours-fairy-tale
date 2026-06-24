---
title: Admin-editable detail-tier previews
date: 2026-06-24
status: design
zone: configurator
---

# Admin-editable detail-tier previews

## Problem

The configurator's "Detail level" control (`basic` / `detailed` / `premium`) is
text-only: a short `label`, a computed `caption`, and a one-line `note`. Parents
can't *see* what each tier buys. We have three preview images (one per tier —
e.g. basic as-expected, detailed adds clothing colors / small props, premium
adds fine accessories like necklaces and watches) uploaded to the public
`site-media` collection. We want each tier to show its image + a richer
title/description in a preview panel — and all of it editable by studio staff
without a deploy, exactly like the pricing numbers already are.

## Approach (decided)

- **Display:** a `DetailPreview` panel rendered inside the configurator's film
  step, **below** the existing "Detail level" `Segmented` control. It shows the
  *currently-selected* tier's image + title + description and swaps as the parent
  picks a different tier.
- **Data model:** extend the existing `pricing` Global's `details[]` array with
  three new optional fields. Single source of truth; the tiers are already wired
  from the global → `getPricing()` → prop → configurator. No second global, no
  second fetch.

This rides the proven pricing pattern end-to-end:
`global → afterChange revalidateTag("pricing","max") → unstable_cache resolver →
server prop → client component`. Revalidation needs **no change** — the existing
`afterChange` hook already busts the `pricing` tag on any save.

## Out of scope (YAGNI)

- No surcharge change — detail `multiplier`s stay ×1.0.
- No new homepage showcase section, no new anchor.
- No `next/image` / `next.config` `remotePatterns` work — render with a plain
  `<img>` (site-media is already re-encoded to webp and size-bounded; matches the
  repo's existing raw `<video src>` precedent for public site-media).

## Detailed design

### 1. Payload Global — `globals/Pricing.ts`

Add three optional fields to the `details` array (after `note`):

```ts
{ name: "image", type: "upload", relationTo: "site-media",
  admin: { description: "Preview image shown in the configurator for this detail level (public site media)." } },
{ name: "title", type: "text",
  admin: { description: "Headline above the preview image. Falls back to the label if empty." } },
{ name: "description", type: "textarea",
  admin: { description: "Short paragraph describing what this detail level captures." } },
```

Notes:
- `type: "upload"` + `relationTo: "site-media"` is Payload's upload-relationship
  field. All three are **optional** — the panel must degrade when any is unset,
  and `DEFAULT_PRICING` (the code fallback) can't reference an uploaded id.
- `defaultValue: DEFAULT_PRICING.details` already seeds the array; the new keys
  simply have no seed value for `image` (text fallbacks come from code — see §2).

### 2. Shared shape + fallback — `lib/pricing.ts`

Extend `DetailLevel`:

```ts
export type DetailLevel = {
  id: string;
  label: string;
  multiplier: number;
  note: string;
  /** Resolved public URL of the preview image (site-media). Optional. */
  image?: string;
  /** Headline for the preview panel. Optional; falls back to label. */
  title?: string;
  /** Paragraph describing what this tier captures. Optional. */
  description?: string;
};
```

Give `DETAILS` (the `DEFAULT_PRICING.details` fallback) `title` + `description`
copy per tier (brand-voice: calm, parent-facing, keepsake — written with the
`brand-voice` skill; reference the clothing-color / accessory examples). Leave
`image` undefined in code — the real images live only in the global.

`computeTotalCents` / `summarizeSelections` / `resolve` are **unaffected** (they
only read `id`/`label`/`multiplier`/`price`). The new fields are display-only.

### 3. Resolver — `lib/pricing-source.ts`

- Read with depth so the upload populates:
  `findGlobal({ slug: "pricing", depth: 1 })`.
- Widen the loose `PricingGlobalDoc.details` element type to include
  `image?: { url?: string | null } | string | null`, `title?`, `description?`.
- In the `details` map, resolve the image URL defensively:
  `image: typeof d.image === "object" && d.image ? (d.image.url ?? undefined) : undefined`,
  `title: d.title ?? undefined`, `description: d.description ?? undefined`.
- The existing non-empty `details` guard and `DEFAULT_PRICING` fallback are
  unchanged — the new fields are all optional and never gate the fallback.

`site-media` has `read: () => true` and `disablePayloadAccessControl: true`, so
the resolved `.url` is a direct public CDN URL — safe to render on a public page
(unlike the gated `media` collection, which must go through proxy routes).

### 4. Display — `components/home/configurator/`

New client component `detail-preview.tsx`:

- Props: the resolved selected `DetailLevel`-ish `{ image?, title?, label, description?, note }`
  (pass what's needed; keep it a plain serializable object).
- Renders a card (brand tokens: `border-[3px] border-brand-deep`, `shadow-comic`,
  rounded) containing, when present, the `<img>` (lazy, `alt` = title/label), the
  title (Fredoka heading), and the description (body). Falls back to `note` when
  `description` is empty; renders nothing extra when `image` is absent (no broken
  image, no empty box).
- Animated swap on tier change via `AnimatePresence mode="wait"` keyed on the
  selected id — mirrors the existing note-swap in `segmented.tsx` /
  `step-film.tsx`. Guard with `useReducedMotion()` (no movement when reduced).

Wiring:
- `index.tsx`: the `detailOptions` mapping currently drops the new fields. Either
  pass the resolved `details` array through to `StepFilm`, or extend `SegOption`.
  **Decision:** pass the full selected detail object separately — keep `SegOption`
  minimal (it's shared with Length). Add a `selectedDetail` (the resolved
  `details.find(...) ?? details[0]`, already computed as `lvl` at `index.tsx:40`)
  prop down to `StepFilm`, which renders `<DetailPreview {...} />` under the
  "Detail level" `Segmented`.
- `step-film.tsx`: accept the new prop, render the panel below the detail
  `Segmented` (line ~66).

### 5. Migration — `migrations/<YYYYMMDD_HHMMSS>_pricing_detail_media.ts`

ADD-only, idempotent, mirroring the sibling style:

```sql
ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "title" varchar;
ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "description" varchar;
ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "image_id" uuid;
-- FK image_id -> site_media(id) ON DELETE SET NULL (DO $$ ... duplicate_object guard)
-- CREATE INDEX IF NOT EXISTS "pricing_details_image_idx" ON "pricing_details" ("image_id");
```

- `down()`: `DROP COLUMN IF EXISTS` the three columns (drop FK implicitly).
- **Register it in `migrations/index.ts`** (import + entry) — every migration is
  listed there.
- `textarea` stores as `varchar` (Payload's column type for text/textarea).
- Single upload relationship → one `<field>_id` column on the array's own table
  with an FK to the target collection. `ON DELETE SET NULL` so deleting a
  site-media asset blanks the reference instead of cascading away the tier row.

> Verify the exact column types/FK/index against what Payload dev `push`
> generates before finalizing the SQL (introspect, don't guess) — same posture
> as `20260623_000000_pricing_global.ts`.

### 6. Tests

- `tests/lib/pricing.test.ts`: `DEFAULT_PRICING.details` carry `title` +
  `description`; the new fields don't perturb `computeTotalCents` /
  `summarizeSelections`.
- `tests/lib/pricing-source.test.ts`: resolver maps a populated
  `image` object → URL string, maps `title`/`description`; a missing/`null`
  image yields `image: undefined` without throwing; full fallback to
  `DEFAULT_PRICING` still holds when `details` is empty.

## Mind maintenance (on finish)

- Update the `configurator` zone card; re-stamp `verifiedAt` to HEAD. Add the new
  globs (`components/home/configurator/detail-preview.tsx`) if the existing
  `components/home/configurator/**` glob doesn't already cover it (it does).
- Add a `map/decisions/` record: **rendering an admin-chosen `site-media` asset
  via a Payload upload relationship + public `.url`** — first use of this pattern
  in the repo (site-media was previously consumed only via a hardcoded blob URL).
- Note the depth-1 read on `getPricing()` as part of the configurator invariant
  set.

## Risk

Low. Additive schema + display-only fields; pricing math, checkout, and the
revalidation path are untouched. The one genuinely new pattern (public
site-media via relationship) is isolated to the resolver + a single read-only
`<img>`.
