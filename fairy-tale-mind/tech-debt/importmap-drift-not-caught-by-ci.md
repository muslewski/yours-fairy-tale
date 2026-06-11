# Import-map drift is not caught by CI

**Status:** open
**Filed:** 2026-06-11
**Found:** in production — /admin rendered blank after the studio-panel deploy.

## What happened

Enabling `clientUploads: true` on `@payloadcms/storage-vercel-blob` makes the
admin UI render the plugin's `VercelBlobClientUploadHandler` client component,
which Payload resolves through the generated import map at
`app/(payload)/admin/importMap.js`. Ours was empty: nothing in the pipeline
re-runs `payload generate:importmap` when payload.config.ts changes, `next
build` succeeds anyway, and the failure only appears client-side at runtime —
so CI (typecheck + vitest + Playwright A/B, none of which open /admin) was
green while production /admin was blank. Fixed by hand-authoring the entry
(commit a5084d4) in the generator's exact output format.

## Why it stays open

The real fix is making drift impossible, not remembering harder. Options, in
rough order of appeal:

1. Add `payload generate:importmap` to the build (e.g. into `prebuild`) so the
   map is always regenerated from the live config. Needs a check that the
   Payload CLI resolves this repo's extensionless TS imports in CI/Vercel
   (it failed in the dev sandbox under plain Node 24).
2. A Playwright Layer B smoke that loads /admin's login page and asserts the
   React tree actually rendered (would have caught this).
3. At minimum: a checklist invariant on the payload-backend zone card —
   "changed payload.config.ts admin components/plugins → regenerate the
   import map" (added alongside this note).

## How to reproduce / verify

Empty the import map, `npm run build`, open /admin with BLOB_READ_WRITE_TOKEN
set: blank page, console errors about a component missing from the import map.
