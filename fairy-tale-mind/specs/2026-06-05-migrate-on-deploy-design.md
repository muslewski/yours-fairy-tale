# Auto-apply Payload migrations on production boot

**Date:** 2026-06-05
**Status:** approved (design)
**Related:** [[no-production-db-migrations]] (the debt this closes), [[payload-backend]]

## Problem

Payload's `db-postgres` adapter only runs `drizzle push` when `NODE_ENV !== 'production'`.
On Vercel `NODE_ENV === 'production'`, so prod schema is frozen at whatever was last
pushed. The repo has committed migrations in `migrations/`, but nothing runs them against
prod, and the `payload migrate` CLI does not work on this stack: under its `tsx` loader the
extensionless imports in `payload.config.ts` (e.g. `./collections/Admins`) fail to resolve
(`ERR_MODULE_NOT_FOUND`), because the project relies on `moduleResolution: "bundler"` which
only Next's bundler honors.

Consequence: every new Payload field 500s production until someone manually applies the
schema. This has happened twice (wizard fields, then `orders_customer_notes`). Prod's
`payload_migrations` table is empty — both committed migrations were applied by push/direct
DDL, never recorded.

## Goal

Migrations apply to the prod DB automatically, with no manual step and without relying on
the broken CLI. Preview and dev must be untouched.

## Approach

Run migrations programmatically on production server boot via Next 16's `instrumentation.ts`,
calling `payload.db.migrate()` (Payload's own migrate — transactioned, idempotent, records
`payload_migrations`). This routes around the CLI: calling Payload from inside the app uses
Next's working module resolution, so the extensionless-import failure never occurs.

Considered and rejected:
- **Build-time `payload migrate` in `buildCommand`** — cleaner timing (once per deploy,
  before traffic) but requires fixing the fragile `tsx` loader resolution, the exact thing
  that has blocked migrations. Environment-dependent and brittle.
- **Custom pg-based SQL runner** — reimplements Payload's `payload_migrations` tracking and
  diverges from its semantics; most maintenance. Rejected.

## Components

### `instrumentation.ts` (repo root, new)
Next 16's instrumentation hook. `register()` runs once per server instance at startup.
Guard, then delegate:

```
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.VERCEL_ENV === "production") {
    const { runProductionMigrations } = await import("@/lib/run-migrations");
    await runProductionMigrations();
  }
}
```

- `NEXT_RUNTIME === "nodejs"` — never attempt on the edge runtime (no pg / no Payload there).
- `VERCEL_ENV === "production"` — never on preview or dev. **Critical**: preview deploys use
  the *same* `POSTGRES_URL` as prod, so an unguarded migrate would mutate prod schema from a
  preview build.
- Dynamic `import()` so the migrate code (and its heavy Payload deps) is only loaded when the
  guard passes.

### `lib/run-migrations.ts` (new)
`runProductionMigrations()`:

1. `const payload = await getPayloadClient()` — reuses the memoized client.
2. Acquire a **blocking** Postgres advisory lock on a fixed 64-bit key, using the adapter's
   pg pool (`payload.db.pool`), on a dedicated client. Blocking (not `try_`) so that when
   several instances cold-start together, one migrates while the others wait, then see
   nothing pending and proceed against the ready schema.
3. `await payload.db.migrate()`.
4. Release the lock (`pg_advisory_unlock`) and release the pooled client in a `finally`.
5. Wrap the whole thing in try/catch: on failure, `console.error` loudly but **do not
   rethrow** — a migrate hiccup must not crash the boot of an already-live site.

Lock key: a fixed integer constant (documented in-file) shared by all instances of this app.

## Behavior

- **First prod deploy after this ships:** `payload_migrations` is empty but tables exist
  (from prior push). Payload runs both committed migrations; both are `IF NOT EXISTS` /
  idempotent, so they apply without error and get recorded. This reconciles the empty
  tracking table.
- **Later deploys:** only genuinely-new migrations run; if none, it's one fast lookup.
- **Preview / local dev:** guard fails → no-op. Local dev keeps using drizzle push.

## Testing

- Unit test (`vitest`): `runProductionMigrations` is import-guarded; assert the
  `instrumentation.register()` path early-returns with no DB access when `VERCEL_ENV` is not
  `production` (the safety-critical branch). The actual migrate against a live DB is not
  unit-tested (no DB in unit context); it is covered by the real prod deploy.

## Out of scope (filed separately)

Preview deployments share the prod `POSTGRES_URL` (Production + Preview scope on the same
env var), so previews read/write prod data. Real issue, larger than this change — filed as
its own tech-debt, not addressed here.
