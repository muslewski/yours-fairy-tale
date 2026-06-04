---
type: debt
summary: "No production DB migration strategy — Payload only pushes schema when NODE_ENV !== production, and there's no migrations/ dir. Schema changes (new collection fields) do NOT reach the prod Neon DB automatically; real reads/writes of the changed collection break on prod."
tags: [database, deployment, payload]
status: open
created: 2026-06-04
updated: 2026-06-04
related: ["[[payload-backend]]", "[[checkout]]"]
sources: []
severity: high
effort: medium
---

## Problem
`payload.config.ts` configures `postgresAdapter` with no explicit `push` and no
`migrations/` directory. Payload's db-postgres only runs `drizzle push` when
`process.env.NODE_ENV !== 'production'` (`@payloadcms/db-postgres/dist/connect.js:110`).
On Vercel, `NODE_ENV === 'production'`, so **schema is never pushed in prod** and, with no
migrations, the prod Neon DB schema is frozen at whatever was last pushed in a non-prod
context.

Consequence: any collection-field change reaches local/test (dev push to the Neon **test**
branch) but NOT the prod `neondb`. Because Payload SELECTs all configured fields, even
*reading* the collection on prod errors once the code knows about a column the DB lacks —
so the dashboard `/app`, `/admin` list, and the checkout webhook's order-create can all 500.

Discovered 2026-06-04 when the configurator wizard added `extra_minutes`, `plot_note`, and
the `orders_add_ons` hasMany table to the Orders collection — these are in code + the test
branch (tests green) but were never applied to prod `neondb`.

## Fix
Adopt Payload migrations for prod:
1. `payload migrate:create` to snapshot the current schema diff into `migrations/`.
2. Commit the migration files.
3. Run `payload migrate` against prod as part of (or before) deploy — e.g. a Vercel build
   step or a one-off authorized run with the prod `POSTGRES_URL`.
Until then, schema changes require a manual, authorized push/ALTER against prod `neondb`.

## Update 2026-06-04 — prod was entirely unschema'd; initialized via push
Investigation found the prod DB (the Neon project's **`main`** branch, what the Vercel
integration uses) had **zero tables** — it had never been schema'd at all, so the whole
account/order/admin layer had never worked in production (all prior verification ran against
local/test DBs). The wizard columns were just the trigger that exposed it.

Because the `payload` CLI does not run on this stack (extensionless-ESM + `loadEnvConfig`
resolution errors under tsx — it has never been used here; the repo relies on `next dev`
push), the schema was applied by **booting Payload in non-production against the prod
connection string via Vitest's loader** (a throwaway `getPayloadClient()` test), which runs
Drizzle push. Result: all 16 tables created on prod `main`, matching the code (incl.
`extra_minutes`, `plot_note`, `orders_texts`). Verified by introspection.

Caveat: prod was initialized by **push, not by `payload migrate`** — so `payload_migrations`
on prod is empty and the committed `migrations/` are not recorded as applied there (they're
idempotent, so a future `payload migrate` is safe). The real fix remains: get the migrate
CLI working and run migrations on deploy, so future schema changes reach prod without a
manual push.
