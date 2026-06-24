---
type: decision
date: 2026-06-24
status: accepted
zone: cms-pages
tags: [routing, cms]
---

# CMS pages live at root `/[slug]` with a reserved-slug guard

## Context
The new `pages` collection needs a URL scheme. The site already has many static
routes under the `(site)` group (`/blog`, `/contact`, `/series`, `/studio`,
`/legal/*`, `/order-confirmed`, `/legacy-examples`, the ten numbered concept
pages) plus the gated `(app)` and `(payload)` groups.

## Decision
Serve CMS pages from a single dynamic segment `app/(site)/[slug]/page.tsx` at the
**root** (pretty URLs like `/about`), NOT a `/p/` namespace and NOT a nested
`[...slug]` catch-all.

Collisions are prevented two ways:
1. **Next routing precedence** — static segments resolve before the dynamic
   `[slug]`, so `/blog` etc. always hit their own route.
2. **A reserved-slug guard** — `lib/reserved-slugs.ts` `RESERVED_SLUGS` +
   `isReservedSlug()`; the collection's `slug` field `validate` rejects any
   reserved value (and a `beforeValidate` hook normalizes case/spacing). This is
   belt-and-suspenders: even though static routes already win, the guard stops an
   editor from creating a page whose slug can never resolve.

## Alternatives rejected
- **`/p/[slug]` namespace** — zero collision risk but ugly URLs; not how the
  Payload website template does it and weaker for SEO/marketing.
- **`/[...slug]` nested paths** — would pull `@payloadcms/plugin-nested-docs`
  forward into this sub-project; deferred to sub-project 2.

## Consequences
- New top-level pages get clean URLs immediately.
- The reserved list must be kept in sync if new static routes are added.
- Nested folder paths (`/guides/bedtime`) are not yet supported (sub-project 2).
