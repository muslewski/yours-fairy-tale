---
title: CMS Pages — a block-composed, SEO'd, revalidated Pages collection
date: 2026-06-24
status: design
zone: payload-backend
relatedZones: [homepage, app-shell, configurator]
---

# CMS Pages — "a real page builder, proven on one page"

## Problem

Every marketing surface today is hand-coded: the homepage is a fixed
composition of section components (`app/(site)/page.tsx`), the blog is
file-based (`lib/blog.ts` + `content/blog/`), and SEO is per-route
`export const metadata`. There is no way to author a new page, edit copy, or
ship a landing page without a developer and a deploy.

We want a **proper site builder** modeled on the Payload website template
(`templates/website`): a `Pages` collection composed of layout **blocks**,
per-page **SEO**, and **on-demand revalidation** so edits go live without a
redeploy — and an App Router that resolves CMS pages at clean URLs.

This is **sub-project 1 of 2**. It builds the pipeline end-to-end and proves it
on **one fresh page**. The homepage stays hardcoded and the configurator (the
Stripe money-path) is untouched. Sub-project 2 (later) adds form-builder,
search, redirects, nested paths, frontend draft preview, and ports the homepage
sections into blocks.

## Decisions (locked in brainstorming)

1. **Scope:** prove the pipeline on a NEW page; do not migrate the homepage now.
2. **Routing:** root `/[slug]` with a reserved-slug guard (not a `/p/` namespace,
   not nested `[...slug]`).
3. **SEO:** the official `@payloadcms/plugin-seo` (meta group + SERP preview).
4. **Publishing:** Payload drafts/versions (draft vs published) + on-demand
   revalidation. Frontend draft *preview* is deferred to sub-project 2.
5. **Starter blocks:** a 4-block content kit — Hero, RichText, Media, CTA.

## Approach (decided)

A `Pages` collection whose `layout` is a Payload **blocks** field. Each block has
two halves: a config (`blocks/<Name>/config.ts`) and a brand-styled React render
component (`components/blocks/<Name>.tsx`). A `RenderBlocks` server component maps
`blockType` → component and renders the array in order.

A single dynamic route `app/(site)/[slug]/page.tsx` resolves a published page by
slug via the Payload Local API, renders its blocks, and supplies metadata from
the plugin-seo `meta` group. Next resolves the many existing static routes
(`/blog`, `/contact`, …) before this dynamic segment; a collection-level reserved
-slug validator additionally forbids a page from claiming one of those slugs.

Caching + revalidation mirror the existing `lib/pricing-source.ts` pattern:
`unstable_cache` reads tagged `pages` / `page:<slug>`, and the collection's
`afterChange`/`afterDelete` hooks call `revalidatePath` + `revalidateTag`.

The migration (new `pages` table, the `_pages_v` versions table, plugin-seo
fields, block tables) is committed and auto-applies on deploy via
`instrumentation.ts` — the established prod-migration path.

## Detailed design

### Data model — `collections/Pages.ts`

- **`slug`** — `text`, required, unique, indexed. A `validate` fn rejects any
  value in `RESERVED_SLUGS` (see below) and normalizes to lowercase, hyphenated.
- **`title`** — `text`, required. Admin `useAsTitle`; also the plugin-seo
  `generateTitle` source.
- **`layout`** — `blocks` field, `minRows: 0`, the four starter blocks.
- **`versions: { drafts: true }`** — adds draft/published status. Optionally
  `drafts: { autosave: false }` to keep it simple.
- **Access:**
  - `read`: published pages are public; drafts readable only by an authenticated
    admin (`({ req }) => req.user ? true : { _status: { equals: 'published' } }`).
  - `create/update/delete`: admins only (reuse the existing admin access pattern).
- **Hooks:** `afterChange` and `afterDelete` → `revalidatePage` (see below).
- **Admin:** `group: 'Content'`, `defaultColumns: ['title','slug','_status','updatedAt']`.

`RESERVED_SLUGS` (a shared const, e.g. `lib/reserved-slugs.ts`): `blog`,
`contact`, `series`, `studio`, `app`, `admin`, `api`, `sign-in`, `open`,
`order-confirmed`, `legacy-examples`, `privacy`, `terms`, `refund`, and the ten
concept slugs (`1-magic-sparkle` … `10-floating-3d`). Also reserve the empty
string / `home` (the homepage is not a Page in this sub-project).

### Blocks — config + render pairs

Each block config is a Payload `Block` (`slug`, `interfaceName`, `fields`,
`labels`). Each render component is a server component taking the generated block
type, styled with brand tokens (no hardcoded hex), `shadow-comic*`, and the brand
fonts. All four reuse a shared link shape.

- **Shared link** (`blocks/fields/link.ts` → `LinkGroup`): `{ label: text,
  url: text, newTab: checkbox }`. (An internal reference picker is sub-project 2;
  for now `url` is a plain string — internal `/path` or external `https://`.)
- **Hero** (`blocks/Hero`): `eyebrow?` (text), `heading` (text, required),
  `subcopy?` (textarea), `ctas` (array of LinkGroup + `variant: select(primary|
  secondary)`, max 2), `background: select(cream|yellow|blue|deep)` default cream.
  Render: a centered hero band; bg + text color derived from `background` via a
  token map; CTAs as brand buttons; respects the "every CTA leads somewhere real"
  invariant (empty `url` → button not rendered).
- **RichText** (`blocks/RichText`): `content` (richText, lexical). Render: the
  `RichText` converter from `@payloadcms/richtext-lexical/react` inside a
  brand-prose wrapper (Fraunces/Quicksand, brand-deep ink).
- **Media** (`blocks/Media`): `media` (upload → `site-media`, required),
  `caption?` (text), `aspect: select(video|portrait)` default video. Render:
  reuse the proven `sample.tsx` frame approach — `aspect-video` vs
  `aspect-[9/16]` width-capped+centered, `object-cover`, comic frame; image →
  `next/image` (or `<img>` if simpler given the public `.url`), video → native
  `<video controls playsInline preload="none">`.
- **CTA** (`blocks/CTA`): `heading` (text, required), `subcopy?` (textarea),
  `buttons` (array of LinkGroup, max 2), `background: select` default yellow.
  Render: a banner echoing the `cta-banner.tsx` energy (not a literal copy).

### Render pipeline — `components/blocks/render-blocks.tsx`

```
RenderBlocks({ blocks }: { blocks: Page['layout'] })
```
Maps `block.blockType` → the matching render component via a lookup object;
renders in array order with a stable `key`; unknown `blockType` → `null`
(forward-compatible when sub-project 2 adds blocks the deployed frontend predates).
Server component. If a future block needs interactivity it carries its own
`"use client"` leaf — none of the four starter blocks do.

### Routing — `app/(site)/[slug]/page.tsx`

- **`generateStaticParams`** → `getPublishedPageSlugs()` (reserved/home already
  excluded by the validator). Returns `{ slug }[]`.
- **`generateMetadata({ params })`** → fetch the page (honoring `draftMode()`),
  map the plugin-seo `meta` → Next `Metadata` (title falls back to page `title`;
  description from `meta.description`; canonical `/<slug>`). OG image: if
  `meta.image` set, use its `.url`; else fall back to the existing dynamic
  `lib/og.tsx` (title-driven). Unknown page → minimal metadata (the page itself
  will `notFound()`).
- **Default export** (async server component): read `draftMode()`; fetch via
  `getPageBySlug(slug, { draft })`; `notFound()` if missing or (not draft and not
  published). Render `<RenderBlocks blocks={page.layout} />`.
- Wrapped by the existing `(site)/layout.tsx` (nav/footer come from app-shell as
  for every other `(site)` route). Confirm during planning whether nav/footer are
  in the layout or per-page; match the established pattern.

### Caching + revalidation

`lib/pages-source.ts`:
- `getPageBySlug(slug, { draft }): Promise<Page | null>` — when `draft` is true,
  bypass the cache and query Payload with `draft: true`; otherwise wrap a Local
  API `find({ collection:'pages', where:{ slug }, limit:1 })` in `unstable_cache`
  tagged `['pages', 'page:'+slug]`.
- `getPublishedPageSlugs(): Promise<string[]>` — cached read tagged
  `['pages','pages-sitemap']` of published slugs.
- Both fall back gracefully (return `null` / `[]`) on a DB error, like
  `getPricing()` — a DB hiccup never 500s the route.

`collections/Pages/hooks/revalidate.ts`:
- `afterChange`: `revalidatePath('/'+doc.slug)`, `revalidateTag('page:'+doc.slug)`,
  `revalidateTag('pages-sitemap')`; if the slug changed, also revalidate the old
  path/tag from `previousDoc`. Guard with `if (!context.disableRevalidate)` so
  SQL/seed writes can opt out.
- `afterDelete`: same revalidations for the removed slug.

### Wiring

- **`payload.config.ts`**: import + register `Pages` in `collections`; add to
  `plugins`: `seoPlugin({ collections: ['pages'], uploadsCollection: 'site-media',
  generateTitle: ({ doc }) => doc?.title, generateURL: ({ doc }) =>
  'https://www.yoursfairytale.com/' + (doc?.slug ?? '') })`. Pin
  `@payloadcms/plugin-seo@^3.85.0` (matches core 3.85; 3.85.1 is published).
- **`app/sitemap.ts`**: make `default` async; append `getPublishedPageSlugs()`
  results (tagged read, so a publish revalidates the sitemap) to the existing
  static routes. Keep the `www.yoursfairytale.com` base already in the file.
- **Types**: regenerate `payload-types.ts` so `Page` / block interfaces exist
  (`interfaceName` on each block makes them importable).

### Migration

A new committed migration creates `pages`, `_pages_v` (drafts/versions), the
block tables, and plugin-seo's `meta_*` columns, plus indexes for `slug` and
`_status`. It auto-applies on deploy via `instrumentation.ts`
(`payload.db.migrate()` at boot) — the established prod path; no manual step.

## Known risk — local Payload CLI is broken

`payload migrate` and `payload generate:types` currently fail locally (Node
`require(esm)` + tsx vs `@next/env`, plus an extensionless `./collections/Admins`
import — see the configurator/payload-backend zone history). Drafts + plugin-seo
**require** a real migration and fresh types, so the plan must resolve this. In
order of preference:

1. **Fix the loader** so `payload migrate create` / `generate:types` run (e.g.
   add the missing extension, adjust the tsx invocation). Best outcome — unblocks
   all future Payload schema work.
2. If the loader can't be fixed quickly, **hand-author** the migration
   (`up`/`down` SQL) by diffing the dev-pushed schema, and hand-extend
   `payload-types.ts` (the resolver already casts around generated types where
   needed). Verify the migration against the Neon test branch before committing.

The plan will pick one during implementation and record which in a decision note.

## Verification

- `npx tsc --noEmit` clean; `npm run build` compiles.
- **Vitest** (DB-light unit): the reserved-slug validator (rejects `blog`,
  accepts `about`, normalizes case); `getPageBySlug` graceful-null on a thrown
  read; `RenderBlocks` renders known types in order and skips unknown.
- **Headless Playwright on the deploy**: seed one published page ("about", a Hero
  + RichText + Media + CTA); `GET /about` renders all four blocks; `<title>` and
  `meta[name=description]` come from the seo group; `og:image` resolves; an
  unpublished page → 404; editing + publishing in `/admin` makes the change appear
  without a redeploy (revalidation). Screenshot for a brand gut-check.

## Out of scope (sub-project 2)

Form-builder blocks, search, redirects, nested-docs (`[...slug]`), frontend draft
preview (`draftMode` preview route + secret), auto `SectionWave`s between blocks,
internal-reference link picker, porting the homepage section designs into blocks,
and migrating the homepage itself to a Page.

## Mind maintenance (on finish)

- Re-stamp `payload-backend` (new collection + plugin) and `app-shell`
  (sitemap + the new `[slug]` route); add `[[homepage]]`/`[[configurator]]`
  cross-links noting the homepage is intentionally NOT yet a Page.
- New zone card `cms-pages` (or fold into `payload-backend` — decide at
  recollection) owning `collections/Pages*`, `blocks/**`, `components/blocks/**`,
  `lib/pages-source.ts`, `app/(site)/[slug]/**`.
- Decision records: the routing choice (root `/[slug]` + reserved guard) and the
  migration/CLI resolution.
- `npm run mind`; commit the updated cards + `map/index.md` to `main`.

## Risk

Medium. New collection + plugin + dynamic route + migration, but additive and
isolated — no checkout/auth/pricing surface touched, the homepage and configurator
are untouched, and reads fall back gracefully. The one genuine unknown is the
broken Payload CLI blocking migration/type generation; called out above with a
fallback path.
