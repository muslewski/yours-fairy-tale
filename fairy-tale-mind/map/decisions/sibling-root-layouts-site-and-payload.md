# Sibling root layouts: (site) and (payload)

**Date:** 2026-06-12
**Status:** decided (shipped in cf03e40, verified live)

## What

All site routes moved from the top of `app/` into the `app/(site)/` route
group, which carries the marketing root layout (fonts, globals.css, preloader,
metadata). The top-level `app/layout.tsx` was deleted. `(site)` and
`(payload)` are now sibling root layouts; only `api/`, `global-error.tsx`,
icons/manifest, and robots/sitemap remain at the `app/` root. URLs are
unchanged (route groups are invisible).

## Why

Production `/admin` rendered blank (React #418, hydration text mismatch). The
top-level root layout wrapped the `(payload)` group, and Payload's
`RootLayout` renders its own `<html>/<body>` — the served page contained two
nested `<html>` documents, which browsers flatten while parsing, so React's
client tree never matched the DOM. The bug dated from the first Payload
integration; nobody had ever opened production `/admin` (no first admin user
existed), so it shipped unnoticed and was uncovered while debugging the studio
deploy. Payload's own scaffold uses exactly this sibling-group shape
(`(frontend)`/`(payload)`); we had deviated.

## Consequences

- `/admin` no longer inherits the site's fonts/preloader/Tailwind — Payload
  fully owns its document, as designed.
- Navigating between site and admin is a full document load (two root
  layouts); irrelevant for a staff-only surface.
- `scripts/mind/generate.mjs` `routeExists()` learned to strip route-group
  segments; the prebuild Mind verifier (which rightly failed the first deploy
  of the move because zone globs were stale) validates the new paths.
- Related debt: [[importmap-drift-not-caught-by-ci]] — the same incident's
  other lesson (no smoke test opens /admin).
