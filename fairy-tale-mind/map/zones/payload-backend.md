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
    - "collections/Admins.ts"
    - "lib/payload.ts"
    - "app/(payload)/layout.tsx"
    - "app/(payload)/admin/[[...segments]]/page.tsx"
    - "app/(payload)/admin/[[...segments]]/not-found.tsx"
    - "app/(payload)/admin/importMap.js"
    - "app/(payload)/api/[...slug]/route.ts"
    - "app/(payload)/api/graphql/route.ts"
    - "app/(payload)/api/graphql-playground/route.ts"
    - "tests/payload/boot.test.ts"
    - "tests/setup-env.ts"
depends: []
invariants:
  - rule: "`admins` is the ONLY auth:true collection — it is the staff/dev /admin login. Customer auth is a separate later slice via Better Auth on plain (non-auth) collections."
    enforcedBy: ["tests/payload/boot.test.ts"]
  - rule: "Never hardcode the connection string or secret — read process.env.DATABASE_URI / PAYLOAD_SECRET."
    enforcedBy: []
verifiedAt: a61f9263268f98a65fbe7d78bc5898cea8cb5c3e
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
- `app/(payload)/…` — the route group: admin pages, layout, generated `importMap`, and the
  REST/GraphQL/playground handlers from `@payloadcms/next/{layouts,views,routes}`.
- `next.config.ts` is wrapped with `withPayload(...)`.

## Tests
`tests/payload/boot.test.ts` boots Payload, asserts `admins` is auth-enabled, and runs a
live `count` against Postgres (proves DB connectivity + dev schema push). `tests/setup-env.ts`
loads `.env` via Node's built-in `process.loadEnvFile` (the `dotenv` package is not
installed in this repo, despite shipping with some Payload setups).

## Lineage
First slice of the purchase → account → dashboard plan
(`fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md`, Task 1.1 + 1.2). Shapes
adapted from the verified `delieta` reference, which runs the same stack (Next 16.2.6 ·
Payload 3.85). Later slices add the Better Auth customer collections, Orders, and Media.

## Notes / tech debt
- `payload generate:importmap` / `generate:types` fail under Node 25 (the CLI's tsx worker
  can't resolve extensionless relative imports). The committed `importMap` is the correct
  empty map for a config with no custom components; regenerate on a supported Node, or once
  custom admin components are added. `payload-types.ts` is not generated yet for the same
  reason — it is not required for the app to run.
