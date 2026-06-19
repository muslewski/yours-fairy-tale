---
type: zone
summary: "The test suite — vitest (unit/integration, DB-backed) + a hybrid Playwright E2E suite (deterministic Layer A, DB-backed Layer B on a Neon test branch, gated @smoke Layer C) + a CI typecheck step + the agent-order-tooling MCP harness (tests/agent-mcp/* vitest suite + e2e/agent-loop.spec.ts Layer B). The green-flag-for-production gate across Stripe · Payload · Better Auth · Next.js."
tags: [testing]
status: active
created: 2026-06-03
updated: 2026-06-15
related: ["[[checkout]]", "[[configurator]]", "[[auth-gating]]", "[[payload-backend]]", "[[series]]", "[[studio]]", "[[agent-tooling]]"]
sources: ["[[2026-06-03-playwright-test-suite-design]]", "[[e2e-hybrid-playwright-neon-branch]]", "[[2026-06-14-agent-order-tooling-mcp-design]]"]
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
  - rule: "CI runs `npx tsc --noEmit` as its own step — type errors fail the pipeline even when no test imports the broken file."
    enforcedBy: [".github/workflows/test.yml"]
verifiedAt: 2c8160b
---

## Purpose
The pre-PR-to-production gate: prove a customer can still **pay, get an account, and reach their
dashboard** after any change across the four fast-moving stacks (Stripe · Payload · Better Auth ·
Next.js). Not exhaustive coverage — a critical-path safety net.

## Layers
- **vitest** (`tests/**`) — unit/integration incl. webhook signature/idempotency,
  checkout-gated account creation, owner-scoped access, the BA→Payload adapter,
  waitlist validation/persistence (`tests/waitlist/*`), the production env contract
  (`tests/lib/required-env.test.ts`), and trustedOrigins (`tests/auth/server.test.ts`).
  Mostly DB-backed; a pure no-DB subset (pricing, contact route, waitlist route,
  required-env, auth server) runs anywhere.
- **Playwright Layer A** (`e2e/checkout.spec.ts`, `e2e/sign-in.spec.ts`, `e2e/waitlist.spec.ts`,
  `@layerA`) — deterministic, mock at our API edge (no DB, no real Stripe).
- **Playwright Layer B** (`e2e/dashboard.spec.ts`, `e2e/studio.spec.ts`, `@layerB`) — DB-backed
  dashboard-by-status + ownership, plus the studio panel (gate bounce, sign-in, queue, status
  advance), using a `storageState` auth fixture (`e2e/fixtures/auth.ts`) + out-of-process seeding
  (`e2e/fixtures/seed*.ts`, incl. `seedAdmin`).
- **Playwright Layer C** (`e2e/smoke/purchase.spec.ts`, `@smoke`) — real Stripe test-mode purchase
  through `stripe listen`. Gated; run on demand, NOT in CI.
- **CI typecheck** — a dedicated `npx tsc --noEmit` step in `.github/workflows/test.yml`.
- **Agent harness vitest suite** (`tests/agent-mcp/*`) — 9 test files covering the
  `agent-order-tooling` MCP server: safety guard (pure, no DB), synthetic Stripe event shapes,
  customer cores, orders/customer/studio/payments/auth-maintenance tool groups, and the 16-tool
  registration check. DB-backed tests run against the Neon test branch via `.env.test`.
- **Agent harness Layer B** (`e2e/agent-loop.spec.ts`, `@layerB`) — end-to-end agent loop:
  `createOrder` → `mintLoginLink` → success landing shows the order on the customer dashboard.

## How to run
- `npm run test` — vitest. `npm run test:e2e` — Playwright A+B (CI default). `npm run test:all` — both.
- `npm run test:e2e:smoke` — Layer C (needs `stripe listen --forward-to localhost:3100/api/stripe/webhook`).
- The Playwright webServer runs on **port 3100** (3000/3002 reserved). Env from `.env.test`.
- The Playwright webServer BUILDS the app — a green CI run on a branch is also build evidence.

## Lineage
Designed + planned 2026-06-03 (`[[2026-06-03-playwright-test-suite-design]]`,
`[[2026-06-03-playwright-test-suite]]`); rationale in `[[e2e-hybrid-playwright-neon-branch]]`.
Built subagent-driven on `feat/e2e-tests`.
Launch hardening (2026-06-10): added `tests/waitlist/*` + `e2e/waitlist.spec.ts` (real
waitlist), `tests/lib/required-env.test.ts` (env contract), webhook orphan-event
throw-for-retry coverage in `tests/stripe/webhook.test.ts`, a CI typecheck step, and
removed the placeholder `tests/smoke.test.ts`. Known smell: `tests/stripe/webhook.test.ts`
inlines event literals that duplicate `tests/stripe/refund-email.test.ts` helpers (see
the `stripe-test-event-fixtures-duplicated` tech-debt note).
Studio panel (2026-06-10): added `tests/studio/*` (auth bridge, pure workflow core,
DB-backed action guardrails, metadata-only video attach), `tests/lib/delivery.test.ts`
(promise math + countdown states), and `e2e/studio.spec.ts` (Layer B) with `seedAdmin`
in the shared seed fixtures (see `[[studio]]`).
Agent order-tooling MCP (2026-06-14): added `tests/agent-mcp/*` (9 files — guard, synthetic
Stripe, cores, orders, customer, studio, payments, auth-maintenance, registration) and
`e2e/agent-loop.spec.ts` (Layer B agent loop); the enabling refactor extracted customer cores
into `lib/order-action-cores.ts` (see `[[agent-tooling]]`).
In-studio live card (2026-06-16): added `tests/lib/studio-elapsed.test.ts` (elapsed-time
formatting) and `tests/lib/in-studio-stamp.test.ts` (once-stamp idempotency guard).
Durable order-access link (2026-06-17): added `tests/lib/order-access-token.test.ts` (pure
token/TTL) and `tests/auth/order-access.test.ts` (DB-backed cores, the `/open` route, AND a
regression for the afterChange-hook self-deadlock — advancing to proof_ready must persist a
token without hanging); `tests/app/status-email-link.test.ts` repointed to the new mechanism
(see `[[2026-06-17-durable-order-access-link]]`).
Studio video delivery (2026-06-17): added `tests/lib/blob-upload-options.test.ts` (pins the
multipart upload flag) and `tests/lib/delivery-url.test.ts` (https validation + display
helpers); `tests/studio/actions.test.ts` gained delivery-link cases (store/clear/reject +
link-only satisfies the proof_ready/delivered guardrail). See `[[2026-06-17-studio-delivery-link]]`.
