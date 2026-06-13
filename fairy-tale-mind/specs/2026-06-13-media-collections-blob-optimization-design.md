---
type: spec
summary: "Split media into two upload collections — customer media (the existing gated `media`) and a new public admin-managed `site-media` — on a single public Vercel Blob store; add server-side image optimization that bounds customer-photo storage; add an ownership-gated in-app preview gallery so a parent can see the photos they uploaded."
tags: [media, blob, payload, optimization, privacy]
status: planned
created: 2026-06-13
updated: 2026-06-13
related: ["[[payload-backend]]", "[[auth-gating]]", "[[blob-pass-through-proxied-video]]", "[[local-disk-video-delivery]]"]
sources: []
origin: "brainstorming 2026-06-13"
---

# Two media collections + Vercel Blob optimization + in-app preview

**Date:** 2026-06-13
**Status:** Approved (brainstorming), ready for implementation plan

## Summary

Two upload collections with different access models, both on one **public**
Vercel Blob store (one token, no new env var):

1. **`media` (kept as-is) = customer media** — children's photos, proofs, final
   videos. `adminOnly` on all operations; customers receive bytes ONLY through
   ownership-gated routes. The slug stays `media` so the `Orders.assets / proof
   / finalVideo` relationships and ~8 referencing files are untouched; it is
   only relabeled "Customer media" in the admin UI.
2. **`site-media` (new) = admin/site media** — brand and marketing imagery the
   team uploads in `/admin`, isolated from customer PII. Public read, admin-only
   write, direct CDN URLs.

Plus: **server-side image optimization** that bounds customer-photo storage, and
a **new ownership-gated in-app preview gallery** so a parent can see the photos
they uploaded back.

### Decisions locked in brainstorming

- **Customer media stays gated-public**, not a private store. The Payload
  Vercel-Blob plugin is public-only today (its type allows only
  `access: 'public'`; private is "planned"). The existing ownership-gated proxy
  + secret store id + unguessable prefixes already protect the data; true-private
  (a custom adapter + private store + signed URLs + studio rework + migration)
  remains a separately-scoped future project, already tracked in
  [[local-disk-video-delivery]]. **No new env var.**
- **`site-media` is stand-up only** — collection + optimization + `/admin`
  upload, not wired into any page yet. Render it when a future feature needs it.
- **One public store, one token.** Per-collection plugin options give site-media
  direct URLs while customer media keeps access control.

## Public vs private Vercel Blob (reference, for the record)

- A Blob **store** is created public or private (store-level; distinct
  hostnames), and **each store has its own `BLOB_READ_WRITE_TOKEN`** — "use both"
  means two stores, two tokens.
- **Public**: every file has a CDN-served URL anyone with the link can open
  (`…public.blob.vercel-storage.com/…`). Fast, globally cached, cheap.
- **Private**: bytes require auth (`…private.blob.vercel-storage.com/…`) — read
  server-side via `get(path,{access:'private'})` and streamed, or via a
  short-lived **signed URL** (`presignUrl`/`issueSignedToken`). Verified present
  in `@vercel/blob` 2.4.0.
- **Plugin gap:** `@payloadcms/storage-vercel-blob` 3.85 supports only
  `access:'public'` (`node_modules/@payloadcms/storage-vercel-blob/dist/index.d.ts:3-10`).
  So private is reachable only outside the plugin. This is why customer media
  stays gated-public for now.

## Collection 1 — `media` (customer media, kept)

`collections/Media.ts`. Unchanged: `slug: "media"`, `access` all `adminOnly`,
`upload.filesRequiredOnCreate: false` (studio metadata-only creates),
`staticDir` dev fallback. Changes:

- **Relabel** in admin only: `admin.group: "Commerce"` (kept) + add
  `labels: { singular: "Customer media", plural: "Customer media" }`.
- **Restrict accepted formats to sharp-decodable images + video** so server-side
  processing never chokes:
  `upload.mimeTypes: ["image/jpeg", "image/png", "image/webp", "video/mp4",
  "video/quicktime", "video/webm", "video/x-matroska"]`. (HEIC is dropped from
  the server-accepted set — see Optimization for how the client handles it.)
- **Server-side image optimization** (see Optimization section): `formatOptions`
  + `resizeOptions` to cap and re-encode the original, plus one `imageSizes`
  preview variant. Video files pass through untouched (sharp ignores non-images).
- `fields`: `alt` (kept).

The customer photo upload (`uploadOrderAssets`) and studio video uploads
continue to target `media` unchanged at the call sites.

## Collection 2 — `site-media` (new, public)

`collections/SiteMedia.ts`:

```ts
export const SiteMedia: CollectionConfig = {
  slug: "site-media",
  admin: { group: "Site", useAsTitle: "alt" },
  access: {
    read: () => true,            // public — files are public on a public store
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    staticDir: path.resolve(dirname, "../site-media"),  // dev fallback dir
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    formatOptions: { format: "webp", options: { quality: 82 } },
    imageSizes: [
      { name: "thumbnail", width: 400 },
      { name: "card", width: 1024 },
      { name: "hero", width: 1920 },
    ],
    focalPoint: true,
  },
  fields: [
    { name: "alt", type: "text", required: true },
    { name: "caption", type: "text" },
  ],
};
```

Registered in `payload.config.ts` `collections` after `Media`. SVG is allowed
but skipped by sharp resizing (Payload passes vector through). No page renders
it yet; a future consumer reads `doc.url` / `doc.sizes.<name>.url` (direct CDN
URLs, thanks to `disablePayloadAccessControl`).

## Blob plugin config (`payload.config.ts`)

```ts
vercelBlobStorage({
  enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  token: process.env.BLOB_READ_WRITE_TOKEN,
  clientUploads: true,                       // studio browser→blob (unchanged)
  collections: {
    media: true,                             // gated + proxied (unchanged)
    "site-media": {
      disablePayloadAccessControl: true,     // direct CDN URLs, no Payload proxy
      prefix: "site",                        // store-internal namespace: site/…
    },
  },
}),
```

One store, existing token. `addRandomSuffix` stays `false` globally — the
studio's `head(filename)` resolution (pathname == filename) depends on it.

**Customer-media path hardening:** customer photos are namespaced under an
unguessable per-order prefix (`orders/<orderId>/`) so store-internal paths are
not enumerable. `uploadOrderAssets` sets the document-level `prefix` at create
time (the cloud-storage plugin reads a per-doc `prefix`). The blob URL never
reaches the client regardless (gated proxy only); this is defense in depth and
also organizes the store. Studio video pathnames already embed the orderId.

## Optimization strategy

**Goal:** a 15 MB phone photo must not cost 15 MB of storage, and in-app
previews must be small/fast — without leaning on Next/Image (it cannot fetch
gated customer media).

**Customer photos** (`media`, three layers):
1. **Client (exists):** `components/app/prepare-upload.ts` already shrinks > cap
   files to ≤ 2048 px JPEG @ 0.85. **Extended:** always convert HEIC→JPEG on the
   client (not only when over cap), since the server-accepted set excludes HEIC
   and Payload/sharp may lack HEIF decode. If the browser cannot decode a HEIC
   (some non-Safari), keep the existing gentle error (supersedes part of
   [[heic-photos-over-cap-rejected]]).
2. **Server (new):** `media.upload.resizeOptions` caps the original to 2048 px
   longest edge (`{ width: 2048, height: 2048, fit: "inside",
   withoutEnlargement: true }`) and `formatOptions: { format: "webp",
   options: { quality: 80 } }` re-encodes it. This bounds every stored original
   regardless of what the client sent.
3. **Preview variant (new):** one `imageSizes` entry
   `{ name: "preview", width: 640 }` (WebP) for the in-app gallery.

So each photo is stored as a bounded WebP original + a ~640 px WebP preview.
Videos are not image-processed.

**Site media** (`site-media`): the `imageSizes` set above + WebP-capped original
(`formatOptions` webp 82). Direct URLs mean a future page can also let Next/Image
optimize further, but deterministic variants exist immediately.

## In-app preview (new) — the parent sees what they uploaded

Today `photo-upload.tsx` only shows a "thank you" and the form disappears; the
customer never sees their photos back. Add a gallery on the customer order page.

- **New gated route** `app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts`:
  `GET` returns the preview variant bytes for one asset, ownership-checked.
  - Reuses `assertOwnsOrder(id)` (the single ownership doorway).
  - Confirms `assetId` is in that order's `assets` (so a customer can't read an
    arbitrary media id through their own order).
  - Resolves the media doc's `sizes.preview.filename` (falls back to the original
    `filename` if no preview), then proxies the bytes from Blob with
    `head(filename)` + fetch — the same pattern as the video route, minus Range
    (images need no Range). `Cache-Control: private, no-store`.
- **New resolver** `resolveOwnedAsset(orderId, assetId, size)` in
  `lib/video-access.ts` (or a new `lib/media-access.ts` if that file grows too
  large — decide in the plan), mirroring `resolveOwnedVideo`.
- **New component** `components/app/uploaded-photos.tsx`: a thumbnail grid of
  `order.assets`, each `<img src={`/api/orders/${id}/asset/${assetId}`}>` (plain
  `<img>` — gated URLs aren't Next/Image-optimizable), with alt text and a calm
  empty state. Rendered on the order detail page below the story panel whenever
  the order has assets.
- Non-owners get 403 (same as videos). The server component reads the assets list
  via the Local API (`overrideAccess: true`) and passes ids down; bytes flow only
  through the gated route.

## Files

| File | Change |
|---|---|
| `collections/Media.ts` | relabel; mimeTypes; resizeOptions + formatOptions + preview imageSize |
| `collections/SiteMedia.ts` | **new** public collection |
| `payload.config.ts` | register SiteMedia; per-collection blob options |
| `migrations/<ts>_site_media.ts` | **new** — site_media tables + sizes columns |
| `migrations/index.ts` | register the migration |
| `lib/order-actions.ts` | `uploadOrderAssets` sets per-order `prefix` |
| `components/app/prepare-upload.ts` | always convert HEIC→JPEG client-side |
| `lib/video-access.ts` (or new `lib/media-access.ts`) | `resolveOwnedAsset` |
| `app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts` | **new** gated image route |
| `components/app/uploaded-photos.tsx` | **new** preview gallery |
| `app/(site)/(app)/app/orders/[id]/page.tsx` | mount the gallery |

## Migration / data

- **No data migration of existing media.** Existing `media` docs and their blobs
  stay; the optimization applies to NEW uploads only (existing files keep their
  current bytes — acceptable).
- **One new migration** adds the `site-media` tables (Payload generates a base
  table + `_sizes` columns for imageSizes). Hand-author idempotently in the house
  style and **verify against `payload migrate:create` output** before merge, as
  with prior migrations.
- The new `media` imageSize ("preview") and resize/format options change the
  upload pipeline but **not the existing `media` table schema** meaningfully —
  Payload stores size metadata in existing `sizes`-style columns; verify whether
  a migration is needed for the new `preview` size columns and include it if so
  (check `migrate:create`).

## Testing

House pattern ([[testing]]): vitest (DB-backed) + Playwright.

- **Access (DB):** `site-media` read is public (anonymous read ok) and
  create/update/delete are admin-only; `media` remains adminOnly on all ops.
- **Asset route (DB):** owner fetches a preview for an asset on their order (200);
  a non-owner is rejected (403); an `assetId` not on the order is rejected even
  for the owner; a missing/!ready asset is a calm 404.
- **Optimization (DB):** uploading an oversized test image to `media` yields a
  doc whose original is WebP and within the dimension cap, plus a `preview` size;
  uploading to `site-media` yields the three named sizes.
- **Studio unaffected:** metadata-only create on `media` still works (the
  mimeTypes change must still allow the video types the studio attaches).
- **Playwright (Layer B):** a signed-in customer with an `awaiting_assets` order
  uploads a photo, then sees it in the new gallery; the gallery `<img>` loads via
  the gated route.

## Out of scope (deliberate)

- True-private customer media (private store, signed URLs, custom adapter,
  studio rework, migration) — remains [[local-disk-video-delivery]].
- Wiring `site-media` into any page (blog, marketing, homepage).
- Migrating existing `/public` static images into the CMS.
- Backfilling optimization onto already-uploaded customer media.
- Adaptive video streaming / CDN offload for videos (unchanged).

## Risks on record

1. **sharp format support in the Vercel runtime.** The whole server-side
   optimization assumes Payload's bundled sharp can decode the accepted formats.
   Mitigation: accepted mimeTypes are restricted to jpeg/png/webp (+ svg for
   site-media, which sharp passes through); HEIC is converted client-side before
   it reaches the server. Verify a real upload of each accepted type on a preview
   deploy.
2. **Migration accuracy.** The `site-media` tables and any new `media` size
   columns must match Payload's generated SQL — diff against `migrate:create`
   before merge (prior migrations carry the same note).
3. **Upload-time cost.** Generating variants adds sharp work to the upload path;
   customer media is kept to one preview variant to stay within function limits;
   videos skip image processing.
4. **Studio mimeTypes coupling.** The studio attaches video media docs to
   `media`; the new `mimeTypes` allow-list MUST include the studio's video types
   or attach/upload breaks. Covered by the studio-unaffected test.
