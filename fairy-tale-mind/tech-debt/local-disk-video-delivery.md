---
type: debt
summary: "REMAINING (narrowed 2026-06-10): delivered videos now proxy from Vercel Blob behind the ownership gate, but the blobs are PUBLIC (unguessable, never exposed) and every byte flows through a Node route. Future work: private Blob + short-lived signed playback URLs (or Mux / Cloudflare Stream). Local disk persists only as the no-token dev fallback."
tags: [video, media, security, infra]
status: open
created: 2026-06-03
updated: 2026-06-13
related: ["[[auth-gating]]", "[[payload-backend]]", "[[blob-pass-through-proxied-video]]", "[[two-media-collections-public-and-gated]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md"
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
  - "fairy-tale-mind/plans/2026-06-13-media-collections-blob-optimization.md"
severity: low
effort: medium
---

## Update 2026-06-10 — largely superseded by Blob delivery
The original local-disk concern is resolved: `[[blob-pass-through-proxied-video]]`
moved media storage to Vercel Blob (`vercelBlobStorage` pass-through mode in
`payload.config.ts`) and the ownership-gated route now proxies bytes from Blob
(`head(filename)` + Range forwarding) — local disk is only the dev fallback when
`BLOB_READ_WRITE_TOKEN` is unset. The ownership gate (`resolveOwnedVideo`) was kept
as the single doorway, exactly as this note prescribed. The studio panel's
browser-to-Blob uploads and the proof preview's `?kind=proof` playback
(2026-06-10) both ride the same gate and change nothing about the remaining
work below.

**Remaining debt (why this stays open, severity lowered to low):**
- Blobs are stored at **public-but-unguessable** URLs. The URL never reaches the
  client (server-side proxy only), which is accepted for MVP — but true defense in
  depth wants **private Blob storage + short-lived signed playback URLs**, or a
  managed video host (Mux / Cloudflare Stream) minting signed URLs after
  `resolveOwnedVideo`.
- Every video byte still proxies through a Node route handler — no CDN offload, no
  adaptive streaming.

## Update 2026-06-13 — now also covers customer PHOTOS
With the two-media-collections work (`[[two-media-collections-public-and-gated]]`),
customer photos join videos behind the same ownership-gated proxy: a new route
`app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts` (via `resolveOwnedAsset`,
same `assertOwnsOrder` doorway) streams the small `preview` size, and the "Photos
you sent" gallery reads through it. The bytes still live on the **public** Vercel
Blob store (unguessable URLs, never exposed). So the remaining-debt items in this note — private
Blob + short-lived signed URLs (or a managed video host) — now applies to BOTH
videos AND photos. Customer media stays GATED-PUBLIC because the Payload
Vercel-Blob plugin is public-only today (the core `@vercel/blob` SDK supports
private, but only outside the plugin). Still open, severity unchanged (low).

## Problem
The customer dashboard's `delivered` action (Task 4.4) plays `order.finalVideo`
through an ownership-checked route handler
(`app/(app)/api/orders/[id]/video/route.ts`) that reads the file from the
local-disk `media` upload dir (`MEDIA_STATIC_DIR`) and streams the bytes (with
Range support). Access is gated by `resolveOwnedVideo` (`lib/video-access.ts`),
which runs the same `assertOwnsOrder` guard as every mutating action — so a
customer can only fetch a film attached to an order they own, never a guessable
static URL.

This is a deliberate **MVP shortcut** for dev. It is fine locally but not for
production:
- The `media` collection still uses Payload's default local-disk storage
  (`collections/Media.ts`), which does not survive serverless / multi-instance
  deploys.
- Even gated, the app itself proxies every byte of every video through a Node
  route handler — no CDN, no signed-URL offload, no adaptive streaming.

## Fix
Move delivery to access-controlled / signed video infra and keep the ownership
gate in front of it:
- a managed video host — **Mux** or **Cloudflare Stream** — issuing short-lived
  **signed playback URLs** minted server-side after `resolveOwnedVideo`, or
- **private Vercel Blob** storage + short-lived signed URLs (wire
  `@payloadcms/storage-vercel-blob` per the note in `collections/Media.ts`).

The ownership gate (`resolveOwnedVideo`) stays; only the byte source / URL
minting changes. The MVP shortcut is flagged with a prominent comment in both
`lib/video-access.ts` and the route handler.
