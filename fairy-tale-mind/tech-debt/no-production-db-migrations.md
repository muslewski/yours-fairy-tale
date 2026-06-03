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

## Immediate follow-up (this change)
The Orders columns from the wizard work (`extra_minutes`, `plot_note`, `orders_add_ons`)
must be applied to prod `neondb` before a real purchase or a logged-in dashboard view will
work in production. This is a prod DB write and needs explicit authorization.
