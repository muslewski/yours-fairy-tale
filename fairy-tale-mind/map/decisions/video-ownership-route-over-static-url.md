---
type: decision
summary: "The delivered film is served through an ownership-checked route handler that streams the local file, not via a direct (guessable) media URL — because the media collection is read: adminOnly."
tags: [video, security, customer-area]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[auth-gating]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md"
decided: 2026-06-03
supersededBy: ""
---

## Context
Task 4.4 adds the `delivered` action to the customer dashboard: a parent watches
their finished film, `order.finalVideo`. That film is a doc in the `media`
upload collection, whose access is `read: adminOnly`. A customer's browser
therefore cannot fetch it through Payload's own `/api/media/file/<name>`
endpoint. We need a way to serve the bytes to the owning customer only.

## Decision
Serve the video through an **ownership-checked route handler**,
`app/(app)/api/orders/[id]/video/route.ts`, whose `<video src>` and download
link the dashboard points at. The handler calls `resolveOwnedVideo(orderId)`
(`lib/video-access.ts`), which runs the **same `assertOwnsOrder` guard as every
mutating order action**, then resolves `finalVideo` and streams the local file
(Range-aware, so scrubbing works; `?download` sets an attachment disposition).
Access is gated by **who owns the order**, never by a guessable static URL.

## Why
- It reuses the one security doorway the customer area already trusts
  (`assertOwnsOrder`) instead of inventing a second access path.
- It keeps `media` `read: adminOnly` intact — we do not loosen collection access
  to make customer playback work.
- It is the simplest secure-enough approach for the dev MVP: no new infra, no
  signed-URL service, while still being un-guessable and owner-scoped.
- A missing `finalVideo` resolves to `null` → the route answers 404 and the UI
  shows a gentle "your video is being finalized" fallback rather than crashing.

## Consequences
This streams bytes off **local disk** through the app. That is a deliberate MVP
shortcut, flagged with prominent comments in `lib/video-access.ts` and the route,
and tracked in `[[local-disk-video-delivery]]`: production must move to
access-controlled / signed delivery (Mux or Cloudflare Stream signed playback
URLs, or private Vercel Blob + signed URLs). The ownership gate
(`resolveOwnedVideo`) stays; only the byte source / URL minting changes.
