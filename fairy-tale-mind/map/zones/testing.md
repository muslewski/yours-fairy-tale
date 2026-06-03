---
type: zone
summary: "The test suite — vitest (unit/integration, DB-backed) + a hybrid Playwright E2E suite (deterministic Layer A, DB-backed Layer B on a Neon test branch, gated @smoke Layer C). The green-flag-for-production gate across Stripe · Payload · Better Auth · Next.js."
tags: [testing]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]", "[[auth-gating]]", "[[payload-backend]]"]
sources: ["[[2026-06-03-playwright-test-suite-design]]", "[[e2e-hybrid-playwright-neon-branch]]"]
owns:
  routes: []
  anchors: []
  globs:
    - "playwright.config.ts"
    - "vitest.config.ts"
    - "e2e/**"
    - "tests/**"
    - ".github/workflows/test.yml"
depends: ["[[checkout]]", "[[auth-gating]]", "[[payload-backend]]"]
invariants:
  - rule: "@smoke (real Stripe) is excluded from the default/CI run; CI gates on vitest + Layer A+B only."
    enforcedBy: ["package.json:test:e2e (--grep-invert @smoke)", ".github/workflows/test.yml"]
  - rule: "Tests run against the Neon test branch (.env.test) — never prod neondb or local Docker."
    enforcedBy: ["tests/setup-env.ts", "playwright.config.ts"]
verifiedAt: c0ecf3a
---

## Purpose
The pre-PR-to-production gate: prove a customer can still **pay, get an account, and reach their
dashboard** after any change across the four fast-moving stacks (Stripe · Payload · Better Auth ·
Next.js). Not exhaustive coverage — a critical-path safety net.

## Layers
- **vitest** (`tests/**`, 84 tests) — unit/integration incl. webhook signature/idempotency,
  checkout-gated account creation, owner-scoped access, the BA→Payload adapter. DB-backed.
- **Playwright Layer A** (`e2e/checkout.spec.ts`, `e2e/sign-in.spec.ts`, `@layerA`) — deterministic,
  mock at our API edge (no DB, no real Stripe).
- **Playwright Layer B** (`e2e/dashboard.spec.ts`, `@layerB`) — DB-backed dashboard-by-status +
  ownership, using a `storageState` auth fixture (`e2e/fixtures/auth.ts`) + out-of-process seeding
  (`e2e/fixtures/seed*.ts`).
- **Playwright Layer C** (`e2e/smoke/purchase.spec.ts`, `@smoke`) — real Stripe test-mode purchase
  through `stripe listen`. Gated; run on demand, NOT in CI.

## How to run
- `npm run test` — vitest. `npm run test:e2e` — Playwright A+B (CI default). `npm run test:all` — both.
- `npm run test:e2e:smoke` — Layer C (needs `stripe listen --forward-to localhost:3100/api/stripe/webhook`).
- The Playwright webServer runs on **port 3100** (3000/3002 reserved). Env from `.env.test`.

## Lineage
Designed + planned 2026-06-03 (`[[2026-06-03-playwright-test-suite-design]]`,
`[[2026-06-03-playwright-test-suite]]`); rationale in `[[e2e-hybrid-playwright-neon-branch]]`.
Built subagent-driven on `feat/e2e-tests`.
