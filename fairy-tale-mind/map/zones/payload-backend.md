---
type: zone
summary: "Payload v3 backend — the in-app CMS, /admin panel, REST/GraphQL API, and the admins native-auth collection."
tags: [backend, payload, auth, infrastructure]
status: active
created: 2026-06-03
updated: 2026-06-03
related: []
sources:
  - "fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md"
owns:
  # Routes are served from the `(payload)` route group via catch-all dynamic
  # segments (`/admin`, `/api/[...slug]`, `/api/graphql`, `/api/graphql-playground`).
  # The Mind generator's `routeExists` can't resolve route groups / dynamic
  # segments, so the route files are tracked via `globs` below instead.
  routes: []
  anchors: []
  globs:
    - "payload.config.ts"
    - "migrations/index.ts"
    - "migrations/20260604_000000_wizard_order_fields.ts"
    - "migrations/20260605_000000_order_customer_notes.ts"
    - "collections/Admins.ts"
    - "lib/payload.ts"
    - "app/(payload)/layout.tsx"
    - "app/(payload)/admin/[[...segments]]/page.tsx"
    - "app/(payload)/admin/[[...segments]]/not-found.tsx"
    - "app/(payload)/admin/importMap.js"
    - "app/(payload)/api/[...slug]/route.ts"
    - "app/(payload)/api/graphql/route.ts"
    - "app/(payload)/api/graphql-playground/route.ts"
    - "collections/auth/Users.ts"
    - "collections/auth/Accounts.ts"
    - "collections/auth/Sessions.ts"
    - "collections/auth/Verifications.ts"
    - "lib/better-auth-payload-adapter.ts"
    - "tests/payload/boot.test.ts"
    - "tests/auth/adapter.test.ts"
    - "tests/setup-env.ts"
depends: []
invariants:
  - rule: "`admins` is the ONLY auth:true collection — it is the staff/dev /admin login. Customer auth runs on Better Auth over the plain (non-auth) users/accounts/sessions/verifications collections, bridged via lib/better-auth-payload-adapter.ts."
    enforcedBy: ["tests/payload/boot.test.ts"]
  - rule: "Better Auth persists ONLY through the custom Local-API adapter (lib/better-auth-payload-adapter.ts) at depth:0 — never raw SQL, never the deprecated payload-auth plugin. The users/accounts/sessions/verifications field names mirror BA's camelCase 1:1."
    enforcedBy: ["tests/auth/adapter.test.ts"]
  - rule: "Never hardcode the connection string or secret — read process.env.DATABASE_URI / PAYLOAD_SECRET."
    enforcedBy: []
verifiedAt: ab028c3
---

## Purpose
Payload v3.85 is mounted inside the existing Next 16 app at the repo root (no `src/`).
It owns the database (Postgres via `@payloadcms/db-postgres`, uuid primary keys), the
`/admin` panel, and the REST + GraphQL APIs.

- `payload.config.ts` — `buildConfig`: postgres adapter (`idType: "uuid"`), lexical
  editor, `admin.user = "admins"`, `importMap.baseDir` and `typescript.outputFile` at the
  repo root. Imported elsewhere via the `@payload-config` alias (tsconfig + vitest).
- `collections/Admins.ts` — Payload-native auth for staff/devs (`auth: true`). The ONLY
  auth-enabled collection. `email`/`password` are added automatically.
- `lib/payload.ts` — `getPayloadClient()`, a memoized `getPayload({ config })`.
- `collections/auth/{Users,Accounts,Sessions,Verifications}.ts` — plain (NON-`auth:true`)
  collections whose field names mirror Better Auth's camelCase 1:1. Better Auth owns the
  customer credentials (hashed password on `accounts`); Payload owns the schema.
- `lib/better-auth-payload-adapter.ts` — `payloadBetterAuthAdapter`, a custom
  `createAdapterFactory` (from `better-auth/adapters`) bridge that routes every Better Auth
  DB op (`create/findOne/findMany/update/updateMany/delete/deleteMany/count`) through the
  Payload Local API at `depth: 0`. `MODEL_TO_SLUG` maps `user→users` etc. (`${model}s`
  fallback); a `whereConditionFor` translator maps BA operators
  (`eq/ne/in/not_in/lt/lte/gt/gte/contains/starts_with/ends_with`) to Payload `where`
  conditions. Config: `disableIdGeneration: true` (Postgres mints the uuid, BA reads it
  back), `supportsDates/Booleans/JSON: true`, `transaction: false` (the Local API has no
  nested-tx primitive to hand BA). NOT the deprecated `payload-auth` plugin.
- `app/(payload)/…` — the route group: admin pages, layout, generated `importMap`, and the
  REST/GraphQL/playground handlers from `@payloadcms/next/{layouts,views,routes}`.
- `next.config.ts` is wrapped with `withPayload(...)`.

## Tests
`tests/payload/boot.test.ts` boots Payload, asserts `admins` is auth-enabled, and runs a
live `count` against Postgres (proves DB connectivity + dev schema push). `tests/setup-env.ts`
loads `.env` via Node's built-in `process.loadEnvFile` (the `dotenv` package is not
installed in this repo, despite shipping with some Payload setups).

`tests/auth/adapter.test.ts` round-trips a BA user through the adapter (`create` →
`findOne` by email), proving the bridge reaches Postgres via the Local API and that the
uuid id is minted by the DB and read back as a string. NOTE: the auth + payload test files
each boot their own Payload instance; running them together with vitest's default
file-parallelism races on the single local Postgres schema pull/push — run with
`--no-file-parallelism` (or one file at a time), which is a test-harness limitation, not an
adapter defect.

## Lineage
First slice of the purchase → account → dashboard plan
(`fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md`, Task 1.1 + 1.2). Shapes
adapted from the verified `delieta` reference, which runs the same stack (Next 16.2.6 ·
Payload 3.85). Task 2.1 added the BA → Payload Local-API adapter
(`lib/better-auth-payload-adapter.ts`), faithfully adapted from delieta's verified
~270-line implementation. Later slices wire the BA server/client, sign-in, `/app` gating,
Orders, and Media.

## Notes / tech debt
- `payload generate:importmap` / `generate:types` fail under Node 25 (the CLI's tsx worker
  can't resolve extensionless relative imports). The committed `importMap` is the correct
  empty map for a config with no custom components; regenerate on a supported Node, or once
  custom admin components are added. `payload-types.ts` is not generated yet for the same
  reason — it is not required for the app to run.
