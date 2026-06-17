---
type: zone
summary: "Payload v3 backend — the in-app CMS, /admin panel, REST/GraphQL API, the admins native-auth collection, the Waitlist collection, TWO media collections (gated-public customer `media` + public direct-URL `site-media`) on one Vercel Blob store, and production boot (env validation + migrate-on-deploy)."
tags: [backend, payload, auth, infrastructure]
status: active
created: 2026-06-03
updated: 2026-06-16
related: ["[[migrate-on-deploy-via-instrumentation]]", "[[prod-env-fail-closed]]", "[[blob-pass-through-proxied-video]]", "[[waitlist-signups-payload-plus-resend]]", "[[studio]]", "[[browser-to-blob-uploads-metadata-media]]", "[[two-media-collections-public-and-gated]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md"
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
  - "fairy-tale-mind/plans/2026-06-13-media-collections-blob-optimization.md"
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
    - "migrations/20260610_000000_waitlist.ts"
    - "migrations/20260610_000001_order_amount_promise.ts"
    - "migrations/20260613_000000_media_site_media.ts"
    - "migrations/20260616_000001_order_in_studio_since.ts"
    - "migrations/20260617_000000_orders_access_token.ts"
    - "migrations/20260617_000001_orders_delivery_urls.ts"
    - "collections/Admins.ts"
    - "collections/Waitlist.ts"
    - "collections/Media.ts"
    - "collections/SiteMedia.ts"
    - "instrumentation.ts"
    - "app/api/cron/prune-blobs/route.ts"
    - "vercel.json"
    - "lib/run-migrations.ts"
    - "lib/required-env.ts"
    - "tests/lib/run-migrations.test.ts"
    - "tests/lib/required-env.test.ts"
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
  - rule: "Production boot FAILS CLOSED: instrumentation.ts checks missingProductionEnv (9 vars, lib/required-env.ts) BEFORE running migrations and throws if any is missing — a half-configured deploy 500s every request instead of silently degrading. Asymmetry is deliberate: run-migrations NEVER throws (a failed migration must not kill an already-live site)."
    enforcedBy: ["tests/lib/required-env.test.ts", "tests/lib/run-migrations.test.ts"]
  - rule: "Vercel Blob storage runs in PASS-THROUGH mode (disablePayloadAccessControl NOT set): media file URLs stay on Payload's /api/media/file/* endpoint so `read: adminOnly` keeps gating every byte. Enabled iff BLOB_READ_WRITE_TOKEN is set; without a token, local-disk staticDir (collections/Media.ts) is the dev fallback. The plugin sets clientUploads: true so big /admin uploads also go browser → Blob (past Vercel's ~4.5MB body cap)."
    enforcedBy: ["payload.config.ts"]
  - rule: "media allows METADATA-ONLY creates (filesRequiredOnCreate: false) — the studio's browser-to-Blob uploads create media docs whose filename == the blob pathname with no file payload; Payload never receives the video bytes."
    enforcedBy: ["collections/Media.ts", "tests/studio/attach-video.test.ts"]
  - rule: "There are TWO media collections on ONE public Blob store. site-media is public-read/admin-write with DIRECT CDN URLs (disablePayloadAccessControl: true + `site/` prefix, set per-collection in payload.config.ts); media stays read: adminOnly and is served only through ownership-gated routes. The customer-PII collection (`media`) and the public brand collection (`site-media`) never share an access model. media.mimeTypes is restricted to sharp-safe images (jpeg/png/webp) + the studio's four video types; customer photos are capped to 2048px + re-encoded WebP and carry one `preview` size."
    enforcedBy: ["collections/SiteMedia.ts", "collections/Media.ts", "payload.config.ts"]
  - rule: "Waitlist rows are created ONLY by app/api/waitlist/route.ts via the Local API with overrideAccess — all collection access is adminOnly (same posture as Orders). Email is unique + lowercased (beforeValidate hook, same canonicalization as users.email)."
    enforcedBy: ["collections/Waitlist.ts", "tests/waitlist/waitlist.test.ts"]
verifiedAt: 83b0524
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
- `collections/Waitlist.ts` — series waitlist signups (unique lowercased email, `source`
  text, all access adminOnly; rows created only by the waitlist route via Local API).
  Queryable in `/admin` under the Commerce group. Schema migration:
  `migrations/20260610_000000_waitlist.ts`. The form/route/lib pipeline is owned by
  `[[series]]`.
- **Media storage** — `vercelBlobStorage` plugin (pass-through mode) in
  `payload.config.ts`, enabled iff `BLOB_READ_WRITE_TOKEN` is set; file URLs stay on
  Payload's gated `/api/media/file/*` endpoint and the plugin auto-disables local
  storage. No token (dev) → local-disk `staticDir` from `collections/Media.ts`. See
  `[[blob-pass-through-proxied-video]]`. Since the studio panel (2026-06-10) the plugin
  also sets `clientUploads: true` (big `/admin` uploads stream browser → Blob) and
  `collections/Media.ts` sets `filesRequiredOnCreate: false` so the studio's
  browser-to-Blob flow can create metadata-only media docs (filename == blob pathname,
  no bytes through the server — see `[[browser-to-blob-uploads-metadata-media]]`).
- **Two media collections, one store** (2026-06-13, see
  `[[two-media-collections-public-and-gated]]`). `collections/Media.ts` (slug
  `media`, unchanged — only relabeled "Customer media" in /admin) holds customer
  PII: children's photos, proofs, delivered films. It now restricts `mimeTypes` to
  sharp-safe images (jpeg/png/webp) + the studio's four video types, normalizes
  customer photos server-side (`resizeOptions` cap 2048px `inside` + WebP q80), and
  emits one small `preview` imageSize (640px) for the in-app gallery. `collections/SiteMedia.ts`
  (slug `site-media`) is the NEW public, admin-managed brand collection: `read: () => true`,
  create/update/delete `adminOnly`, WebP `formatOptions`, thumbnail/card/hero
  imageSizes, focalPoint, `alt`+`caption` fields. Both ride the SAME single
  `vercelBlobStorage` plugin (one `BLOB_READ_WRITE_TOKEN`) — but `payload.config.ts`
  configures them per collection: `media: true` (pass-through, proxied) vs
  `"site-media": { disablePayloadAccessControl: true, prefix: "site" }` (direct CDN
  URLs, namespaced under `site/`). No new env var. Schema migration:
  `migrations/20260613_000000_media_site_media.ts` (site_media tables + `media`
  `sizes_preview_*` columns; idempotent; carries a VERIFY-against-`migrate:create`
  note).
- **Production boot** (`instrumentation.ts`, prod Node runtime only) — first validates
  the 9-var env contract (`lib/required-env.ts`) and THROWS on any missing var (fail
  closed, see `[[prod-env-fail-closed]]`); then runs migrate-on-deploy
  (`lib/run-migrations.ts`, advisory-locked, never throws — see
  `[[migrate-on-deploy-via-instrumentation]]`). The register()-throw → failed-requests
  semantics still need confirmation on a real Vercel preview (see the
  `verify-fail-closed-boot-on-vercel` tech-debt note).
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
uuid id is minted by the DB and read back as a string. `tests/lib/required-env.test.ts`
and `tests/lib/run-migrations.test.ts` cover the pure boot guards (no DB). NOTE: the auth + payload test files
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
Migrate-on-deploy via `instrumentation.ts` landed 2026-06-05 (see
`[[migrate-on-deploy-via-instrumentation]]`). Launch hardening (2026-06-10): fail-closed
production env validation added before migrations, the `waitlist` collection +
migration, and Vercel Blob pass-through media storage (from the launch-hardening plan).
Studio panel (2026-06-10): `clientUploads: true` on the Blob plugin,
`filesRequiredOnCreate: false` on media (metadata-only creates for browser-to-Blob
uploads), and migration `20260610_000001_order_amount_promise` adding
`amountTotalCents` + `promisedBy` to orders (see `[[studio]]`).
Two media collections (2026-06-13): the customer `media` collection was relabeled
"Customer media", restricted to sharp-safe image types + the studio's video types,
and given a server-side WebP cap + one `preview` size; a new public `site-media`
collection (direct CDN URLs via per-collection `disablePayloadAccessControl` +
`site/` prefix) carries admin-managed brand imagery; migration
`20260613_000000_media_site_media` adds the site_media tables and the `media`
preview-size columns (see `[[two-media-collections-public-and-gated]]`).

Durable order-access link (2026-06-17): `collections/Orders.ts` gained `accessToken` +
`accessTokenExpiresAt` (admin read-only), with migration `20260617_000000_orders_access_token`
(additive + idempotent: `access_token` text + `access_token_expires_at` timestamptz + a btree
index) — the durable, reusable `/open/<token>` order-access link owned by `[[auth-gating]]`
(see `[[2026-06-17-durable-order-access-link]]`). The Orders afterChange status-email hook now
threads its `req` into `ensureOrderAccessToken` so the in-hook write to the same order row
joins the hook transaction instead of dead-locking on its row lock.

Studio delivery links (2026-06-17): `collections/Orders.ts` gained `proofUrl` +
`finalVideoUrl` (text, staff-editable — NOT readOnly, unlike the system-managed
accessToken), with migration `20260617_000001_orders_delivery_urls` (additive: `proof_url`
+ `final_video_url` text, no index). The external delivery link owned by `[[studio]]`
(see `[[2026-06-17-studio-delivery-link]]`).

Public sample video (2026-06-17): `site-media` now also accepts `video/mp4` + `video/webm`
(sharp passes video through; it stays the PUBLIC direct-CDN-URL collection, unlike the gated
`media`) so a homepage sample film can be uploaded via /admin. `vercelBlobStorage` gained
`addRandomSuffix: true` — @vercel/blob v2 throws on an existing pathname ("blob already
exists"), so every plugin upload now gets a unique name (the /studio video route is separate
and owns its own pathnames, so it is unaffected).

## Notes / tech debt
- `payload generate:importmap` / `generate:types` fail under Node 25 (the CLI's tsx worker
  can't resolve extensionless relative imports). The committed `importMap` is the correct
  empty map for a config with no custom components; regenerate on a supported Node, or once
  custom admin components are added. `payload-types.ts` is not generated yet for the same
  reason — it is not required for the app to run.
