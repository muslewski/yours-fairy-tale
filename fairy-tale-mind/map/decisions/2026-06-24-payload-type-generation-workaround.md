---
type: decision
date: 2026-06-24
status: accepted
zone: cms-pages
tags: [payload, migrations, types, tooling]
---

# Authoring Payload migrations + types despite the broken CLI

## Context
The Payload CLI (`payload migrate:create`, `payload generate:types`) does not run
on this stack — the `payload` bin loads `payload.config.ts` through a path that
does not strip TypeScript (it fails on the first value-level type annotation; see
the configurator/payload-backend history). The CMS `pages` feature needs a real
migration (drafts + plugin-seo add many tables) and accurate block/page types.

## Decision (the method that works)
Both were produced WITHOUT the CLI, using `vite-node` (the one loader proven to
boot this config, same as the agent-mcp tooling):

1. **Migration** — spin an ephemeral local Postgres (`initdb`/`pg_ctl` in a temp
   dir, TCP on a high port, trust auth), point `DATABASE_URI` at it, and boot
   Payload in dev via `vite-node` so the postgres adapter **drizzle-pushes** the
   full schema. `pg_dump --schema-only`, then assemble the `pages*` / `_pages_v*`
   tables, enums, FKs, indexes, and the `payload_locked_documents_rels.pages_id`
   column into an idempotent migration (`CREATE ... IF NOT EXISTS`, enums guarded
   by `duplicate_object`, constraints guarded by a `pg_constraint` name check).
   Validate up → down → up (idempotency) against a clone of the real schema before
   committing. Output: `migrations/20260624_000001_cms_pages.ts`, registered in
   `migrations/index.ts`, auto-applied on deploy via `instrumentation.ts`.

2. **Types** — `generate:types` lives at `payload/dist/bin/generateTypes.js` but is
   blocked by the package `exports` map. Importing the **literal file path**
   (`import("file://" + abs)`, not the package subpath) under `vite-node`, then
   calling `generateTypes(await config)`, regenerates `payload-types.ts`
   successfully.

## Decision (what we commit)
We do **NOT** commit `payload-types.ts`. It is untracked, prod builds without it
(no code imports `@/payload-types`; `withPayload` regenerates it at build), and a
fresh full regen surfaces pre-existing strictness drift in the orders/webhook/
video money-path files (see `[[payload-types-orders-type-drift]]`). Instead the
Pages feature uses hand-authored shapes in `lib/pages-types.ts` and casts the
Local API defensively (like `lib/pricing-source.ts`). This keeps the feature
self-sufficient and prod-faithful.

## Consequences
- Future Payload schema changes can follow the same scratch-PG-push +
  file-path-`generateTypes` recipe — the CLI breakage is no longer a hard blocker.
- The drizzle-push/pg_dump method is the source of truth for hand-authored
  migrations until the CLI is fixed.
