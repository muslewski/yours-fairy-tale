---
type: decision
summary: "Media moved to Vercel Blob via @payloadcms/storage-vercel-blob in PASS-THROUGH mode (Payload access control intact), and customer video delivery proxies bytes from Blob through the existing ownership-gated route. Public-but-unguessable Blob URLs are accepted for MVP; private Blob + signed playback URLs are deferred."
tags: [video, media, security, infra, vercel]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[auth-gating]]", "[[payload-backend]]", "[[video-ownership-route-over-static-url]]", "[[local-disk-video-delivery]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
Local-disk media storage does not survive serverless deploys — uploaded photos and
the delivered films would vanish between Vercel instances. The owner chose Vercel
Blob for launch storage. The question was how to wire it without losing the one
security property the customer area relies on: the film is reachable ONLY through
the ownership-checked route (`[[video-ownership-route-over-static-url]]`).

## Decision
- **`vercelBlobStorage` plugin in pass-through mode** (`disablePayloadAccessControl`
  NOT set) in `payload.config.ts`: media file URLs stay on Payload's own
  `/api/media/file/*` endpoint, so the collection's `read: adminOnly` keeps gating
  every byte; Payload streams from Blob behind the scenes. The plugin auto-disables
  local storage when enabled.
- **Enabled iff `BLOB_READ_WRITE_TOKEN` is set** — dev without a token keeps the
  local-disk `staticDir` fallback unchanged.
- **Customer delivery proxies from Blob through the existing gated route**
  (`app/(app)/api/orders/[id]/video/route.ts`): after `resolveOwnedVideo` passes, the
  route resolves the blob via `head(filename)` and streams `upstream.body` to the
  client, forwarding `Range` (seeking works), relaying 416, surfacing Blob 5xx as a
  500, with `maxDuration = 300` for long downloads. The Blob URL never reaches the
  client.

## Why
- **The gate stays in one place.** `assertOwnsOrder` → `resolveOwnedVideo` remains
  the single security doorway; switching the byte source did not add a second
  access path or loosen `read: adminOnly`.
- Pass-through mode is the only plugin mode that preserves Payload access control;
  the alternative (`disablePayloadAccessControl: true`) would publish direct
  client-side Blob URLs and break the gating model.
- Vercel Blob's standard tier stores objects at **public but unguessable** URLs.
  That is accepted for MVP because the URL is never exposed — it lives server-side
  in the proxy only. Private Blob + short-lived signed playback URLs (or a managed
  video host) remain the post-MVP hardening, tracked in
  `[[local-disk-video-delivery]]`.

## Consequences
- Every video byte still flows through a Node route (no CDN offload, no adaptive
  streaming) — acceptable at launch volume.
- `head(filename)` resolution assumes pathname == filename (no prefix, no random
  suffix configured); this and an end-to-end upload→playback pass must be verified
  on a real Vercel preview (see the `verify-fail-closed-boot-on-vercel` tech-debt
  note's deploy checklist).
- `BLOB_READ_WRITE_TOKEN` joined the required production env contract
  (`[[prod-env-fail-closed]]`).
