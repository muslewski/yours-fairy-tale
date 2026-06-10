---
type: debt
summary: "The production build (and any server-side auth route handler in Turbopack dev) fails: @better-auth/kysely-adapter re-exports DEFAULT_MIGRATION_TABLE, which the installed kysely no longer exports. Pre-existing, repo-wide — not introduced by the dashboard work."
tags: [build, auth, dependencies, blocker]
status: open
created: 2026-06-03
updated: 2026-06-10
related: ["[[auth-gating]]", "[[payload-backend]]"]
sources: []
severity: high
effort: low
---

## Problem
`npm run build` fails (and `next dev` returns 500 for any **server-side** auth
route handler, e.g. the pre-existing `app/api/auth/[...all]/route.ts`) with:

```
The export DEFAULT_MIGRATION_TABLE was not found in module
  node_modules/kysely/dist/index.js
Import trace:
  @better-auth/kysely-adapter/dist/node-sqlite-dialect.mjs
  @better-auth/kysely-adapter/dist/index.mjs
  better-auth/dist/context/init.mjs   →  lib/auth.ts  →  the route/page
```

`better-auth` eagerly bundles ALL of its adapters via `context/init.mjs`,
including `@better-auth/kysely-adapter`, even though this project uses a custom
`payloadBetterAuthAdapter` (`lib/auth.ts`) and never touches kysely. The bundled
kysely-adapter version re-exports `DEFAULT_MIGRATION_TABLE`, a symbol the
installed `kysely` version no longer exports; Turbopack's strict static ESM
resolution turns that into a hard error.

**Verified pre-existing:** the failure reproduces on a clean working tree (no
dashboard changes) — the first import trace is `app/api/auth/[...all]/route.ts`,
which Task 4.4/4.5 did not touch. The new video route and profile page appear in
traces only because they transitively import `lib/auth` (as every auth-gated
surface must); they are not the cause.

Impact on Task 4.4/4.5 verification: the ownership-gated video route could not be
exercised at runtime in dev (the route 500s on the auth import before reaching
our code). The security-critical logic is instead covered by DB-backed unit
tests (`tests/app/video-access.test.ts`) — owner resolves, non-owner /
unauthenticated rejected, missing finalVideo → null — all green. `tsc --noEmit`
is clean.

## Fix
Pin compatible versions so the kysely-adapter's re-export resolves, e.g.:
- align `kysely` with the version `@better-auth/kysely-adapter` expects (or pin
  the adapter to a version matching the installed kysely), or
- upgrade `better-auth` to a release whose `context/init` no longer hard-pulls
  the kysely adapter, or
- mark `@better-auth/kysely-adapter` external to the bundler
  (`serverExternalPackages`) so it is required at runtime, not statically
  analyzed (it is never actually used — the Payload adapter is).

Once resolved, run `npm run build` to green and smoke-test the video route end to
end with a real `delivered` order + `finalVideo`.

## Update 2026-06-10 — status unknown locally; CI build is the deciding evidence
During the launch-hardening pass a local `npm run build` attempt was **OOM-killed**
(Turbopack, sandbox memory limit) — it did NOT reproduce the kysely export error
before the kill, but the build also never completed, so this proves nothing either
way. CI's Playwright webServer **builds the app**, so a green CI run on the
launch-hardening branch is the deciding evidence: if CI is green there, this break
is gone (likely resolved by dependency movement since 2026-06-03) and this note
should be closed citing that run. Left open because that evidence could not be
observed from the sandbox.
