---
type: debt
summary: "Replaced or abandoned studio video uploads leave orphaned blobs in Vercel Blob — nothing deletes the old blob when a proof/final film is re-uploaded, or when an upload succeeds but the attach call never lands. PARTIALLY ADDRESSED (2026-06-16): a daily cron now prunes abandoned configurator/* photo blobs; the studio video orphans remain open."
tags: [studio, video, media, infra]
status: open
created: 2026-06-10
updated: 2026-06-16
related: ["[[studio]]", "[[browser-to-blob-uploads-metadata-media]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-studio-panel.md"
severity: low
effort: low
---

## Problem
The studio's browser-to-Blob upload flow
(`[[browser-to-blob-uploads-metadata-media]]`) writes the video straight to
Vercel Blob and then creates a metadata-only media doc pointing at it
(`filename == blob pathname`). Nothing ever deletes a blob:

- **Replaced uploads** — re-uploading a proof or final film attaches a NEW
  media doc/blob; the previous blob (and its media doc's blob) stays in the
  store unreferenced.
- **Abandoned uploads** — the upload succeeds to Blob but the client's
  `attachUploadedVideo` call never lands (tab closed, network drop): a blob
  with no media doc at all.
- Deleting a media doc in `/admin` doesn't delete its blob either (the doc
  carries no Payload-managed file).

Impact: invisible to customers and staff (playback always resolves the
CURRENTLY-attached filename), no security exposure (blob URLs are unguessable
and never exposed), cost is storage pennies at launch volume.

## Fix
A cleanup pass: `list()` the blobs in the store, diff against the `filename`s
referenced by any media doc, and `del()` the unreferenced ones older than some
safety window (so an in-flight upload isn't swept before its attach call). Run
manually or as a cron. Defer until upload volume makes the storage line item
noticeable.

## Progress (2026-06-16, Phase-3 Task 6)
The **photos-before-checkout** flow introduced anonymous pre-checkout uploads under
the `configurator/` prefix — the same abandonment risk, but unauthenticated, so worth
bounding. A daily cron (`app/api/cron/prune-blobs/route.ts`, scheduled in `vercel.json`
at `0 3 * * *`, authorized via `CRON_SECRET`) now `list()`s `configurator/*`, skips
blobs newer than a 24h safety window AND any still referenced by a media `filename`,
and `del()`s the rest. **Still open:** the original studio proof/final-video orphans
(no prefix scoping yet) — extend the cron to a general media-vs-blob diff when volume
justifies it.
