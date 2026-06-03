---
type: decision
summary: "The test suite is hybrid: deterministic Playwright (mock at our API edge) + DB-backed Playwright on a Neon test branch (storageState auth, out-of-process seeding, magic-link test sink) + a gated @smoke real-Stripe run. vitest + Layers A/B are the PR green-flag gate."
tags: [testing]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[testing]]", "[[auth-gating]]", "[[checkout]]"]
sources: ["[[2026-06-03-playwright-test-suite-design]]"]
decided: 2026-06-03
supersededBy: ""
---

## Context
The app has live payments + user accounts on four fast-moving stacks (Stripe · Payload · Better
Auth · Next.js). We need a fast, reliable "does it still work?" gate before PRs to production. The
critical flows lean on external/stateful pieces (Stripe hosted checkout, the webhook, magic-link
email, the DB, the auth-gated `/app`), and local Docker Postgres proved unreliable.

## Decision
A **hybrid** Playwright suite + the existing vitest tests:
- **Layer A (deterministic):** Playwright mocks at OUR API edge (`page.route` on `/api/stripe/checkout`
  + on `checkout.stripe.com`; mock the magic-link response). No DB, no real Stripe → fast, runs
  anywhere.
- **Layer B (DB-backed):** dashboard-by-status + ownership against a **Neon test branch**, authed via
  a `storageState` fixture.
- **Layer C (`@smoke`, gated):** one real Stripe test-mode purchase via `stripe listen`. Run on
  demand, **excluded from CI**.
- **vitest + Layer A + B = the CI/PR gate.** Tests use the **Neon test branch** (`.env.test`), never
  prod or local Docker.

## Why (the non-obvious bits)
- **Playwright can't mock server-side reads.** The `/app` dashboard is a server component reading
  Payload/DB, so route-mocking can't drive it → Layer B needs a real (test) DB, hence the Neon branch.
- **Payload's ESM/aliased config can't be imported into a Playwright spec** (Playwright's transpiler
  emits CJS → `exports is not defined`). Seeding therefore runs **out-of-process via vitest's loader**
  (`e2e/fixtures/seed.runner.ts` + `seed.vitest.config.ts`), shelled out from the fixture/specs.
- **Better Auth may hash the magic-link token** in `verifications`, so it can't be rebuilt from the DB.
  Instead `sendMagicLink` writes the link to `e2e/.auth/last-magic-link.txt` **only when
  `PLAYWRIGHT_TEST=1`** (strictly gated; no prod impact); the fixture reads it.
- **Docker kept dying mid-run** → a Neon **branch** (instant, isolated from prod `neondb`, always-on)
  is the stable test DB for vitest + Layer B + CI. Branch: `test` on project `ancient-sea-80588068`.

## Consequences
- CI (`.github/workflows/test.yml`) gates PRs on vitest + Layer A+B against the Neon branch (secrets);
  `@smoke` is on-demand/local.
- vitest `testTimeout`/`hookTimeout` bumped to 30s to absorb Neon's ~1-2s per-boot latency.
- The test branch accumulates seeded rows (no per-run teardown); reset with `neonctl branches reset
  test` when desired. The Neon API key is account-wide — rotate it.
- Tests pin to **port 3100** (3000/3002 reserved). Node 24 in CI (Node 25 breaks the Payload CLI).
