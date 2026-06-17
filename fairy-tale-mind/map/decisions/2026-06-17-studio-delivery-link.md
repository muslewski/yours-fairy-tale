---
type: decision
summary: "Studio video delivery gained two things: (1) the browser→Vercel Blob upload uses multipart so 200–500 MB films upload reliably (the 2 GB token cap is unchanged); (2) an external https delivery link per slot (orders.proofUrl / finalVideoUrl) that can STAND ALONE as the delivery or back up an upload. The proof_ready/delivered status guardrail now accepts an uploaded file OR a valid link. Links accept ANY well-formed https URL (no provider allowlist), validated + canonicalized in lib/delivery-url.ts; the customer sees the in-app player and/or an 'open the link' affordance."
tags: [studio, video, delivery, customer-area]
status: active
created: 2026-06-17
related: ["[[studio]]", "[[auth-gating]]", "[[browser-to-blob-uploads-metadata-media]]", "[[local-disk-video-delivery]]"]
sources:
  - "lib/delivery-url.ts"
  - "lib/blob-upload-options.ts"
  - "components/studio/delivery-link-editor.tsx"
  - "fairy-tale-mind/specs/2026-06-17-studio-video-delivery-design.md"
decided: 2026-06-17
supersededBy: ""
---

## Context
Studio films can be large (200–500 MB+), and the existing browser→Blob upload sent
the whole file as one long PUT (`@vercel/blob/client upload()` with no `multipart`),
which stalls/fails on real networks even though the token route already allowed up to
2 GB. Separately, the studio wanted a way to be "100% sure the parent received the
film" — a second, reliable delivery channel for cases where in-app playback or the
upload itself is impractical.

## Decision
- **Multipart uploads.** `lib/blob-upload-options.ts` pins `multipart: true` (parallel,
  individually-retried chunks). The 2 GB cap + the content-type allowlist in the token
  route are unchanged. The server still never sees the bytes.
- **External delivery link, per slot.** `orders.proofUrl` + `orders.finalVideoUrl`
  (text). A studio `DeliveryLinkEditor` validates + stores a pasted link via
  `setDeliveryUrl` → `applyDeliveryUrlCore`.
- **Stand-alone OR backup.** The `applyOrderStatusCore` guardrail accepts an uploaded
  file **OR** a valid link: `proof_ready` needs `proof || proofUrl`, `delivered` needs
  `finalVideo || finalVideoUrl`. If a file is uploaded the link shows alongside it; if
  no file is uploaded a link alone is the delivery.
- **Any https, no allowlist.** `lib/delivery-url.ts` accepts any well-formed `https://`
  URL (Drive, Dropbox, WeTransfer, …) and rejects non-https / unsafe schemes
  (`javascript:`, `data:`, `http:`). It is canonicalized on write and re-validated
  (`deliveryUrlHost`) before any customer-side render, so a non-https value is never
  rendered as a link.

## Why
- Multipart is the minimal fix — the direct-to-Blob path and the 2 GB cap already
  existed; the single long PUT was the only real gap.
- Upload-OR-link matches how delivery actually fails (a file too big to upload should
  not block marking the order delivered).
- No provider allowlist: the link is entered by trusted studio staff; https validation
  is the real safety need, and an allowlist would just block a service until someone
  edits a list.

## Consequences
- New columns `orders.proof_url` + `orders.final_video_url` (migration
  `20260617_000001_orders_delivery_urls`, additive).
- `createOrderTrackingLink`-style follow-ups (rename, env split) are unrelated; the
  studio delivery-link follow-ups (a future managed video host, no resumable lib, no
  email re-send on link add) are listed in the spec's "out of scope".
- The `order-tracking-link.ts` naming debt is separate (`[[durable-order-access-link-followups]]`).
