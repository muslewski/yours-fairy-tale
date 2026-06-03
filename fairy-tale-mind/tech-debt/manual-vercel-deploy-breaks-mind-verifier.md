---
type: debt
summary: "Manual `vercel --prod` (CLI file upload) fails the prebuild Mind verifier with a false 'glob matches no tracked file'; deploy via git push instead."
tags: [dx, deployment]
status: open
created: 2026-06-04
updated: 2026-06-04
related: ["[[testing]]"]
sources: []
severity: low
effort: low
---

## Problem
`npm run build` runs a `prebuild` step (`scripts/mind/generate.mjs`) that verifies every
zone glob resolves to a **git-tracked** file via `git ls-files -- <glob>`, and
`process.exit(1)`s on any miss (generate.mjs:101, :153).

A **manual `vercel --prod`** deploy uploads the working directory as a snapshot. In that
build context `git ls-files` does not reliably see every file (observed: it matched most
globs but reported `components/home/site-nav.tsx` as "matches no tracked file"), so the
verifier hard-fails and the deploy errors — even though the file is committed and present
on `origin/main`.

**Git-push auto-deploys are unaffected** — Vercel git-clones the commit, so `git ls-files`
sees the full tree and the verifier passes. This is why every push-triggered deploy is
Ready while the one-off `vercel --prod` errored.

## Workaround (in use)
Deploy by pushing to `main` (GitHub→Vercel auto-deploy), not `vercel --prod`. If a push
doesn't trigger a build, nudge with `git commit --allow-empty` and push again.

## Fix options
- Make the verifier degrade gracefully when no git tree is present (e.g. fall back to a
  filesystem `existsSync` check when `git ls-files` returns nothing for ALL globs), so
  both deploy paths work; or
- Gate the strict verification to CI/git builds only and just generate (warn) otherwise.
