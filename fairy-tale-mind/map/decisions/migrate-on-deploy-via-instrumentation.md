---
type: decision
summary: "Payload migrations now auto-apply to the prod DB on server boot via Next 16's instrumentation.ts, calling payload.db.migrate() with the bundled migrations array. Guarded to VERCEL_ENV==='production' + Node runtime, serialized by a pg advisory lock, and it drops Payload's dev-push marker first. This resolves the no-production-db-migrations debt: schema changes reach prod without a manual push."
tags: [database, payload, deployment]
status: active
created: 2026-06-05
updated: 2026-06-05
related: ["[[payload-backend]]", "[[prod-customer-notes-table-applied-manually]]"]
sources: ["[[2026-06-05-migrate-on-deploy-design]]", "[[no-production-db-migrations]]"]
decided: 2026-06-05
supersededBy: ""
---

## Context
The `payload migrate` CLI does not run on this stack: under its tsx loader the
extensionless imports in `payload.config.ts` fail to resolve (the repo relies on
`moduleResolution: "bundler"`, which only Next's bundler honors). So committed
migrations never reached prod, and every new Payload field 500'd production until
a manual push (twice: wizard fields, then `orders_customer_notes`). See
[[no-production-db-migrations]].

## Decision
Run migrations programmatically on production boot from Next 16's
`instrumentation.ts`, which uses Next's own (working) module resolution:

- `instrumentation.ts` `register()` guards inline (`NEXT_RUNTIME === 'nodejs'` and
  `VERCEL_ENV === 'production'`) before dynamically importing the heavy migration
  module, so edge/preview/dev never load it. Preview is excluded deliberately
  because it shares the prod `POSTGRES_URL`.
- `lib/run-migrations.ts` `runProductionMigrations()` takes a blocking pg advisory
  lock (so concurrent cold-starts serialize), then calls `payload.db.migrate()`,
  and never throws (logs failures instead of crashing boot). The pure guard
  `shouldRunMigrations()` is unit-tested.

Two non-obvious fixes were required, both found by testing on prod:
1. **Drop the dev-push marker first.** A push-initialized DB carries a `dev`
   (batch -1) row; with it present, `migrate()` shows an interactive confirm
   prompt that, in the non-TTY server runtime, calls `process.exit(0)` and
   silently aborts. The runner deletes batch -1 rows before migrating.
2. **Pass the bundled migrations array.** Without `migrate({ migrations })`,
   Payload calls `readMigrationFiles()`, which imports the `.ts` files from disk
   at runtime — Node can't load `.ts` in the bundled function. Importing the
   array from `migrations/index.ts` (compiled into the bundle) avoids disk reads.

## Consequences
- Verified in prod: `payload_migrations` now records both committed migrations at
  batch 1. This also reconciled the previously-empty tracking table.
- The [[no-production-db-migrations]] debt is resolved.
- New schema changes must still be authored as committed migrations in
  `migrations/` (dev keeps using drizzle push); they then apply automatically on
  the next production deploy.
- Migrations must remain idempotent and safe to run against a push-built schema,
  since the first auto-run replayed both existing migrations.
