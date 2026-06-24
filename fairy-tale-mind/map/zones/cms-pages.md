---
type: zone
summary: "The CMS page builder — a Payload `pages` collection composed of layout blocks (Hero/RichText/Media/CTA), per-page SEO, drafts, and on-demand revalidation, resolved at /[slug]. Sub-project 1: the pipeline, proven on a fresh page; the homepage and configurator are intentionally NOT yet Pages."
tags: [surface, backend, cms, payload]
status: active
created: 2026-06-24
related: ["[[payload-backend]]", "[[app-shell]]", "[[homepage]]", "[[configurator]]", "[[2026-06-24-cms-pages-routing]]", "[[2026-06-24-payload-type-generation-workaround]]"]
sources:
  - "fairy-tale-mind/specs/2026-06-24-cms-pages-design.md"
  - "fairy-tale-mind/plans/2026-06-24-cms-pages.md"
owns:
  routes: []
  anchors: ["route:/[slug]"]
  globs:
    - "collections/Pages.ts"
    - "collections/Pages/**"
    - "blocks/**"
    - "components/blocks/**"
    - "lib/pages-source.ts"
    - "lib/pages-types.ts"
    - "lib/reserved-slugs.ts"
    - "app/(site)/[slug]/page.tsx"
    - "app/(site)/[slug]/layout.tsx"
    - "migrations/20260624_000001_cms_pages.ts"
    - "tests/lib/reserved-slugs.test.ts"
    - "tests/lib/pages-source.test.ts"
    - "tests/components/render-blocks.test.ts"
depends: ["[[payload-backend]]", "[[app-shell]]"]
invariants:
  - rule: "No committed code imports from @/payload-types (the repo does not commit it — withPayload regenerates it at build). Page/block shapes live in lib/pages-types.ts (hand-authored, mirrors the generated interfaces); the source layer casts the Local API find() defensively, like lib/pricing-source.ts."
    enforcedBy: []
  - rule: "A Page slug may never shadow a real route: collections/Pages.ts validates against RESERVED_SLUGS (lib/reserved-slugs.ts) and normalizes the slug; Next also resolves existing static segments before the dynamic [slug]."
    enforcedBy: ["tests/lib/reserved-slugs.test.ts"]
  - rule: "Anonymous reads see published pages only (access.read returns { _status: { equals: published } } for no-user); drafts are admin-only. Published reads are cached (unstable_cache, tags pages / page:<slug>); the collection afterChange/afterDelete hooks bust those tags + pages-sitemap. Reads fall back to null/[] on a DB error — never 500."
    enforcedBy: ["tests/lib/pages-source.test.ts"]
  - rule: "RenderBlocks maps blockType→component and renders unknown types as null (forward-compatible when a later deploy adds blocks the frontend predates)."
    enforcedBy: ["tests/components/render-blocks.test.ts"]
verifiedAt: 1619367
---

## Purpose
A real, admin-editable page builder modeled on the Payload website template. A
`pages` collection whose `layout` is a Payload **blocks** field renders at a
clean `/[slug]` URL, with per-page SEO (`@payloadcms/plugin-seo`) and on-demand
revalidation so edits go live without a deploy. This is **sub-project 1 of 2**:
it builds the pipeline end-to-end and proves it on one fresh page. The homepage
(`[[homepage]]`) stays hardcoded and the Stripe configurator (`[[configurator]]`)
is untouched — both become Pages later (sub-project 2).

## Architecture
- **Collection** `collections/Pages.ts` (slug `"pages"`): `title`, a normalized +
  reserved-guarded `slug`, a `layout` blocks field, `versions:{drafts}`, admin-only
  CRUD, public-published read. `afterChange`/`afterDelete` →
  `collections/Pages/hooks/revalidate.ts` (dynamic-imports `next/cache`, Next-16
  `revalidateTag(tag,"max")` + `revalidatePath`, clears the old slug on rename,
  honors `context.disableRevalidate`).
- **Blocks** `blocks/<Name>/config.ts` (Payload `Block` configs: Hero, RichText,
  Media, CTA + the shared `blocks/fields/link.ts` `linkGroup`) paired with brand
  -styled render components `components/blocks/<name>.tsx`. `components/blocks/
  render-blocks.tsx` dispatches on `blockType`.
- **Routing** `app/(site)/[slug]/` — `layout.tsx` adds the shared nav/footer
  chrome; `page.tsx` does `generateStaticParams` (published slugs),
  `generateMetadata` (plugin-seo `meta` → Next Metadata, honoring `draftMode()`),
  and renders `<RenderBlocks>`, `notFound()` when missing/unpublished.
- **Source** `lib/pages-source.ts` — `getPageBySlug(slug,{draft})` (published reads
  `unstable_cache`d; draft reads bypass) + `getPublishedPageSlugs()` (tagged
  `pages-sitemap`); both fall back gracefully. Mirrors `lib/pricing-source.ts`.
- **Types** `lib/pages-types.ts` — hand-authored Page/block shapes (the repo does
  not commit `payload-types.ts`; see `[[2026-06-24-payload-type-generation-workaround]]`).
- **SEO + sitemap** — `seoPlugin({collections:["pages"], uploadsCollection:
  "site-media"})` in `payload.config.ts`; `app/sitemap.ts` (now async) appends
  published page slugs.
- **Migration** `migrations/20260624_000001_cms_pages.ts` — creates `pages`,
  `_pages_v`, the block tables, plugin-seo `meta_*` columns, enums, FKs, indexes,
  and the `pages_id` column on `payload_locked_documents_rels`. Idempotent;
  auto-applies on deploy via `instrumentation.ts`. Derived from the drizzle-pushed
  schema and verified up/down + idempotent against a clone of the prod schema (the
  Payload CLI can't author it on this stack).

## Invariants
See frontmatter.

## Lineage
Created 2026-06-24 (branch `feat/cms-pages`). Brainstormed hands-off: scope was
narrowed at the front gate to **prove the pipeline on a NEW page** (homepage
migration deferred), root `/[slug]` + reserved guard for routing (see
`[[2026-06-24-cms-pages-routing]]`), official `@payloadcms/plugin-seo` for SEO,
Payload drafts + on-demand revalidation (frontend draft *preview* deferred to
sub-project 2), and a 4-block starter kit (Hero/RichText/Media/CTA). The broken
Payload CLI forced a from-scratch migration + type-generation method
(`[[2026-06-24-payload-type-generation-workaround]]`). Whole-branch review: SHIP
(0 critical / 0 important). Spec/plan: `fairy-tale-mind/specs/2026-06-24-cms-pages-design.md`,
`fairy-tale-mind/plans/2026-06-24-cms-pages.md`. Deferrals in `tech-debt/`.
