---
type: decision
summary: "The orders_customer_notes table (backing the Orders customerNotes array field) was missing on the prod Neon DB, 500ing every order read on /app and /app/orders/[id]. Fixed by an idempotent, additive migration applied DIRECTLY to prod main via neonctl (the payload migrate CLI still does not run on this stack), not recorded in payload_migrations. Second instance of the same root failure mode as the wizard fields."
tags: [database, payload, deployment, incident]
status: active
created: 2026-06-05
updated: 2026-06-05
related: ["[[payload-backend]]", "[[order-detail-subpage-and-notes]]"]
sources: ["[[no-production-db-migrations]]"]
decided: 2026-06-05
supersededBy: ""
---

## Context
Production reported "A server error occurred" on the signed-in dashboard. Live
Vercel runtime logs revealed the actual exception (digest `2312598320`):

```
error: relation "orders_customer_notes" does not exist  (Postgres 42P01)
```

The `customerNotes` array field (added with the order-detail/notes feature —
see [[order-detail-subpage-and-notes]]) needs a backing table
`orders_customer_notes`. Payload `SELECT`s every configured field, so the
dashboard's owner-scoped order read joins that table on every request. Local/test
work because dev `drizzle push` auto-creates it; prod has no push and the feature
shipped with no migration, so the prod `main` Neon branch never got the table.
This is the **exact** failure mode already documented in
[[no-production-db-migrations]] — the wizard fields were the first instance, this
is the second.

## Decision
1. **Committed the missing migration** —
   `migrations/20260605_000000_order_customer_notes.ts` (+ registered in
   `migrations/index.ts`). Idempotent and additive (`CREATE TABLE IF NOT EXISTS`,
   FK guarded by `duplicate_object`, `CREATE INDEX IF NOT EXISTS`); never drops.
   Column shape mirrors Payload's drizzle output for an array field under a
   uuid-PK collection: `_order int`, `_parent_id uuid` (FK → `orders.id` ON
   DELETE CASCADE), `id varchar` PK, `message varchar`, `created_at timestamptz`.
2. **Applied it directly to prod `main`**, not via `payload migrate`. The migrate
   CLI still does not run on this stack (extensionless-ESM/tsx resolution). The
   prod Neon project is Vercel-managed (`ancient-sea-80588068`, org "Vercel:
   Mateusz's projects", db `neondb`) and its connection string is NOT retrievable
   via `vercel env pull` (sensitive/blank); it was reached through the locally
   authenticated `neonctl`. The DDL was run with explicit owner authorization.

## Consequences
- `/app` and `/app/orders/[id]` render again; verified by re-running the exact
  failing lateral-join query against prod post-apply (read succeeded).
- prod `payload_migrations` is STILL empty — both committed migrations were
  applied by push/direct-DDL, not recorded as applied. They are idempotent, so a
  future real `payload migrate` is safe.
- The systemic gap is unchanged and now twice-realized: **any new Payload field
  will 500 prod until its schema is manually applied.** The real fix (migrate on
  deploy) remains open in [[no-production-db-migrations]].
