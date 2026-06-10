---
type: debt
summary: "Browsers that cannot decode HEIC (everything except Safari) reject >3.5MB HEIC photos with a gentle error instead of converting them — a non-Safari parent with large iPhone HEICs must convert/resize manually."
tags: [ux, uploads, customer-area]
status: open
created: 2026-06-10
updated: 2026-06-10
related: ["[[auth-gating]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
severity: low
effort: medium
---

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
