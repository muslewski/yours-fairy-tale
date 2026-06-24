---
type: debt
summary: "CMS pages support drafts (versions:{drafts}) and the /[slug] route + source layer honor draftMode(), but there is no frontend draft-preview enable route (e.g. /api/draft that calls draftMode().enable()). Editors can't view an unpublished page on the real site before publishing — only in /admin."
tags: [cms, payload, preview]
status: open
created: 2026-06-24
updated: 2026-06-24
related: ["[[cms-pages]]"]
sources: []
severity: low
effort: low
---

## What's missing
`collections/Pages.ts` enables drafts and `app/(site)/[slug]/page.tsx` +
`lib/pages-source.ts` already branch on `draftMode()` / `{ draft: true }`. But
nothing SETS the draft cookie: there is no preview route handler that calls
`(await draftMode()).enable()` (typically secret-guarded, plus a Payload admin
`livePreview`/`preview` URL config pointing at it).

## Why it's deferred
Frontend draft preview was explicitly scoped OUT of sub-project 1 (the spec defers
it to sub-project 2). Published rendering is unaffected — `draftMode()` defaults to
disabled, so the live site shows published pages correctly.

## How to apply (sub-project 2)
Add `app/(site)/next/preview/route.ts` (validate a secret, call
`draftMode().enable()`, redirect to the page), wire Payload `admin.preview` /
`livePreview` on the `pages` collection to it, and confirm the existing draft fetch
path renders unpublished content end-to-end.
