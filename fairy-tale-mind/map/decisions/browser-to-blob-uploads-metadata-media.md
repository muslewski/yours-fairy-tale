---
type: decision
summary: "Studio video uploads go browser → Vercel Blob via client-upload tokens (@vercel/blob handleUpload), then attach a METADATA-ONLY media doc (filesRequiredOnCreate: false) whose filename == the blob pathname. onUploadCompleted rejected (doesn't fire on localhost) — the client calls the attach action. Auth-skipping cores quarantined out of 'use server' (POST-reachability). /admin gets clientUploads: true too."
tags: [studio, video, media, security, vercel]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[studio]]", "[[payload-backend]]", "[[blob-pass-through-proxied-video]]", "[[orphaned-blobs-no-cleanup]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-studio-panel.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
The studio attaches a proof preview and the final film to each order. Final
films are **hundreds of MB**; Vercel caps request bodies at ~4.5MB, so neither
a server action nor a normal Payload upload (bytes through `/api/media`) can
carry them in production. The customer playback proxy resolves the stored file
via `head(filename)` against Blob, so whatever upload path we chose had to land
the file at a pathname the existing gate can find.

## Decision
- **Client-token uploads**: `components/studio/video-upload.tsx` streams the
  file browser → Blob with `@vercel/blob/client` `upload()`, against the token
  route `app/studio/api/blob-upload/route.ts` (`handleUpload`). The admin check
  runs inside `onBeforeGenerateToken` — before any token is signed. The server
  never sees the bytes.
- **Metadata-only media docs**: `collections/Media.ts` sets
  `filesRequiredOnCreate: false`, so `attachVideoCore` creates a media doc
  carrying only `filename` (== the blob pathname), `mimeType`, and `filesize`,
  then links it as `proof`/`finalVideo`. `filename == pathname` is the
  load-bearing contract: it is exactly what the playback proxy's
  `head(filename)` resolves.
- **`onUploadCompleted` rejected**: Vercel's upload-complete webhook does not
  fire on localhost, which would have made the dev flow lie. Instead the client
  calls the `attachUploadedVideo` action itself after the upload finishes
  (kind whitelisted, staff-guarded).
- **Auth-skipping cores quarantined**: a security review caught that EVERY
  export of a `"use server"` module is reachable via direct POST (Next's
  data-security guide states this verbatim), so `attachVideoCore` and friends
  live in `lib/studio-order-mutations.ts` (no `"use server"`); only the
  `requireStudioUser()`-guarded actions in `lib/studio-actions.ts` are
  registered as actions.
- **`clientUploads: true` on the Blob plugin** so big uploads work from
  `/admin` too — the plugin's own client-upload path, same browser → Blob
  mechanics.
- `uploadVideoDirect` remains the small-file fallback when Blob is disabled
  (local dev without a token).

## Why
- Direct-to-Blob is the only upload shape that clears the body cap without a
  second piece of infrastructure.
- Reusing `filename` as the pathname keeps `[[blob-pass-through-proxied-video]]`'s
  single gated playback doorway untouched — no second access path, no new URL
  surface (the blob URL still never reaches any client).
- Client-calls-attach is honest in every environment; the webhook variant works
  only deployed.

## Consequences
- An upload that succeeds to Blob but whose attach call never lands leaves an
  **orphaned blob** — invisible and harmless; tracked in
  `[[orphaned-blobs-no-cleanup]]`.
- Media docs created this way have no Payload-managed file; deleting them in
  /admin does not delete the blob (same orphan note).
- `tests/studio/attach-video.test.ts` pins the metadata-only doc +
  filename == pathname contract; `tests/studio/actions.test.ts` pins that only
  guarded actions mutate.
