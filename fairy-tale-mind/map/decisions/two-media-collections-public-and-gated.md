---
type: decision
summary: "Split media into TWO collections on the ONE public Vercel Blob store: site-media (public-read/admin-write, disablePayloadAccessControl + `site/` prefix → direct CDN URLs) for brand imagery, and media (customer photos/proofs/videos, read: adminOnly, served only through ownership-gated routes). Customer media stays GATED-PUBLIC, not private: the Payload Vercel-Blob plugin is public-only today, so true-private Blob is deferred. No new env var — per-collection plugin options on one store. Customer photos are normalized to WebP (2048 cap) + one `preview` size; HEIC is always converted client-side."
tags: [media, security, infra, vercel, customer-area]
status: active
created: 2026-06-13
updated: 2026-06-13
related: ["[[payload-backend]]", "[[auth-gating]]", "[[blob-pass-through-proxied-video]]", "[[browser-to-blob-uploads-metadata-media]]", "[[local-disk-video-delivery]]", "[[heic-photos-over-cap-rejected]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-13-media-collections-blob-optimization.md"
decided: 2026-06-13
supersededBy: ""
---

## Context
The site needs public, admin-managed brand imagery (logos, hero art, marketing
pictures) alongside the existing `media` collection, which holds the most
sensitive bytes in the product: children's photos, proof previews, and delivered
films. The customer `media` collection is `read: adminOnly` and is reached only
through the ownership-gated routes (`[[blob-pass-through-proxied-video]]`,
`[[video-ownership-route-over-static-url]]`). Public brand assets want the
opposite posture — direct, cacheable CDN URLs with no proxy hop — and they must
never share an access model or a bucket namespace with customer PII.

## Decision
- **Two collections, one store.** `collections/SiteMedia.ts` (slug `site-media`)
  is the public, admin-managed brand collection: `read: () => true`, create /
  update / delete `adminOnly`, uploaded only through `/admin`. `collections/Media.ts`
  (slug unchanged — Orders.assets/proof/finalVideo and ~8 files point at it; only
  the admin label became "Customer media") stays `read: adminOnly`. Both live on
  the SAME public Vercel Blob store.
- **Per-collection plugin options, no new env var.** `payload.config.ts` keeps the
  single `vercelBlobStorage` plugin (one `BLOB_READ_WRITE_TOKEN`) and configures
  the collections differently: `media: true` (pass-through, Payload proxies the
  bytes); `"site-media": { disablePayloadAccessControl: true, prefix: "site" }` so
  site-media files get direct CDN URLs and are namespaced under `site/` in the
  shared bucket.
- **Customer media stays GATED-PUBLIC, not private.** The bytes are protected by
  the ownership-gated proxy, not by a private bucket. Photos now also stream
  through a gated route — `app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts`
  via `resolveOwnedAsset(orderId, assetId)` — mirroring the video route (same
  `assertOwnsOrder` doorway, non-owner 403, no Range).
- **Optimization model.** Customer photos are normalized server-side (sharp:
  `resizeOptions` cap 2048px `inside`, re-encoded WebP q80) and get one small
  `preview` imageSize (640px) for the in-app "Photos you sent" gallery. Site-media
  rasters re-encode to WebP (q82) with thumbnail/card/hero imageSizes + focalPoint.
  `media.mimeTypes` is restricted to sharp-safe images (jpeg/png/webp) plus the
  studio's four video types; the client ALWAYS converts HEIC -> JPEG before upload
  (`components/app/prepare-upload.ts`) so HEIF never reaches sharp.
- New migration `20260613_000000_media_site_media.ts` (site_media tables +
  `media` `sizes_preview_*` columns; idempotent, additive; carries a VERIFY-
  against-`migrate:create` note).

## Why
- **Isolate customer PII from public assets.** Two collections give two
  independent access models on one store: a public-read brand library and a
  strictly admin-only customer library whose bytes only ever leave through the
  ownership check. A single collection could not hold both postures safely.
- **Direct URLs for the things that should be public.** `disablePayloadAccessControl`
  on site-media hands the browser the real CDN URL (cacheable, no Node proxy hop),
  which is exactly right for public marketing imagery and exactly wrong for
  customer media — so the flag is applied per collection, not globally.
- **Why gated-public, not private, for customer media.** The Payload
  Vercel-Blob plugin (`@payloadcms/storage-vercel-blob`) is **public-only** today;
  the core `@vercel/blob` SDK supports private blobs but only OUTSIDE the plugin
  (you would have to manage uploads/reads by hand and lose the plugin's collection
  wiring). The ownership-gated proxy already protects every byte (the Blob URL
  never reaches the client), so gated-public is sufficient for launch. True-private
  Blob + signed playback URLs remain deferred and now cover photos as well as
  videos — tracked in `[[local-disk-video-delivery]]`.
- **No new env var** keeps the production env contract (`[[prod-env-fail-closed]]`)
  unchanged: one public store, configured per collection.

## Consequences
- Site-media URLs are public and cacheable by design — anything an admin uploads
  there is world-readable. The PII boundary is enforced by putting customer photos
  in `media` (adminOnly) instead, never in site-media.
- Customer photos now have a small `preview` variant; the in-app gallery
  (`components/app/uploaded-photos.tsx`) loads it through the gated asset route
  with a plain `<img>` (gated dynamic URLs aren't Next/Image-optimizable).
- HEIC handling is narrowed but not closed: a non-Safari browser that cannot
  decode HEIC at all still falls through to the gentle "use a JPEG copy" error
  (`[[heic-photos-over-cap-rejected]]`).
- The migration's column naming must be reconciled against `migrate:create` on a
  real dev DB before merge (Payload's drizzle output wins) — see the note in the
  migration file.
