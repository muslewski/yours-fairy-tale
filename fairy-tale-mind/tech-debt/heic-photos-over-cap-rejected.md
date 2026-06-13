---
type: debt
summary: "NARROWED 2026-06-13: the client now ALWAYS converts HEIC→JPEG (not only over-cap) and the server rejects non-jpeg/png/webp with a gentle message. Residual: a browser that cannot DECODE HEIC at all (everything except Safari) still falls through to the gentle 'use a JPEG copy' error — a non-Safari parent with iPhone HEICs must convert manually."
tags: [ux, uploads, customer-area]
status: open
created: 2026-06-10
updated: 2026-06-13
related: ["[[auth-gating]]", "[[two-media-collections-public-and-gated]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
  - "fairy-tale-mind/plans/2026-06-13-media-collections-blob-optimization.md"
severity: low
effort: medium
---

## Update 2026-06-13 — narrowed by always-convert + server allow-list
The two-media-collections work (`[[two-media-collections-public-and-gated]]`)
tightened both ends:
- The client now **always** converts HEIC/HEIF → JPEG (not only when over the
  3.5MB cap) before upload — `prepareForUpload` detects HEIC by MIME or extension
  and runs the canvas re-encode unconditionally (`components/app/prepare-upload.ts`).
- The server hardened its contract: `collections/Media.ts` `mimeTypes` accepts
  only jpeg/png/webp (+ the studio's video types), and `isServerAcceptedImage`
  (`lib/order-upload-validation.ts`) lets `uploadOrderAssets` reject a non-accepted
  image with a gentle message instead of a raw Payload mimeTypes error.

**Residual (why this stays open, low):** the always-convert still depends on the
browser being able to DECODE the HEIC. On a non-Safari browser that cannot decode
HEIC at all, `createImageBitmap` throws and the pipeline falls through to the
gentle "a little large… please choose a JPEG copy" error. The genuinely-undecodable
case is unchanged; only its trigger surface narrowed.

## Problem
The photo-upload pipeline (`components/app/prepare-upload.ts`) shrinks oversized
photos client-side via canvas (`createImageBitmap` → ≤2048px JPEG) so each request
fits under `MAX_REQUEST_BYTES` (3.5 MB). That re-encode depends on the browser being
able to DECODE the source image. HEIC — the iPhone default format — decodes only in
Safari; in Chrome/Firefox/Edge `createImageBitmap` throws, and the pipeline falls
through to a gentle, actionable error ("…is a little large to send. Please choose a
version under 4 MB, or a JPEG copy.").

So: a parent on a non-Safari browser uploading a large HEIC straight off their
iPhone gets rejected instead of helped. HEICs already under 3.5 MB pass through
untouched (the server accepts them), and Safari users are unaffected.

## Fix
Options, in rough preference order:
- Add a client-side HEIC decode fallback (e.g. `heic2any` / libheif WASM, lazily
  loaded only when `createImageBitmap` fails on an `image/heic*` file) and feed the
  decoded bitmap into the existing canvas re-encode.
- Or accept the oversized original via a direct-to-Blob client upload (bypassing the
  server-action body cap) and convert server-side.
Either way, keep the gentle error as the last resort for genuinely undecodable files.
