---
type: debt
summary: "The delivered video player streams the final film off LOCAL DISK behind an ownership check. Production needs access-controlled / signed delivery (Mux, Cloudflare Stream, or private Blob + signed URLs)."
tags: [video, media, security, infra]
status: open
created: 2026-06-03
updated: 2026-06-03
related: ["[[auth-gating]]", "[[payload-backend]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md"
severity: medium
effort: medium
---

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
