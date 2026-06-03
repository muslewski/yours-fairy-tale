---
type: spec
summary: "A hybrid Playwright E2E suite that acts as the green-flag-for-production gate: fast deterministic browser tests (mock at our API boundary, no DB) + DB-backed dashboard tests on a Neon test branch + one gated real-Stripe smoke. Answers 'can a customer pay, get an account, and reach their dashboard?' after every big change across Stripe · Payload · Better Auth · Next.js."
tags: [testing, checkout, auth, payload]
status: planned
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]", "[[auth-gating]]", "[[payload-backend]]"]
sources: ["[[better-auth-with-payload]]"]
origin: "Brainstorm: establish proper Playwright tests as a pre-PR-to-production confidence gate for the integrated payments+users app. Install the Playwright agent-CLI skills first (done), then design tests for our specific flows (homepage build, sign-in, Stripe), then ensure they run via agents + CI."
---

# Playwright E2E test suite — design

## Goal — the green flag for a production PR
The app now has **real payments and user accounts**, built on four fast-moving stacks
(**Stripe · PayloadCMS · Better Auth · latest Next.js**). Any of them can break the others
on an upgrade or a feature change. This suite is the **regression gate**: after a big change,
run it and get a yes/no on the only questions that matter for shipping —

> *Does the site still take payments? Can a user pay? Does the buyer get an account and reach
> their dashboard?*

**Green = safe to open the PR to production.** It is not about exhaustive coverage; it is
about protecting the **revenue + access core** from silent breakage.

## Strategy (decided) — hybrid
Mock at *our* boundary for speed/determinism where we can; use a real (test) DB where the
surface is server-rendered; keep one real-Stripe smoke for fidelity. The Playwright agent-CLI
skills are installed at `.claude/skills/playwright-cli/` (request-mocking, storage-state,
test-generation, tracing) and inform the patterns below.

### Layer A — Deterministic E2E (no DB, no real Stripe) — the fast default
Runs anywhere instantly, in CI and by agents, zero external setup. Playwright mocks at our
API edge.
- **Homepage build → checkout** (`e2e/checkout.spec.ts`): fill child name + plot + options,
  intercept `POST /api/stripe/checkout` (return a fake `{ url }`) → assert the client POSTs the
  correct **selections** and redirects to that URL. (Server-side price recomputation stays
  covered by the vitest `lib/checkout` + `lib/pricing` tests.)
- **Sign-in UI** (`e2e/sign-in.spec.ts`): mock the magic-link response → assert the
  "check your email" state, the disabled→enabled submit button, and the "No account to create"
  explainer renders.

### Layer B — DB-backed E2E (Neon test branch + `storageState` auth)
The dashboard is a **server component reading the DB**, so Playwright route-mocking can't drive
it — it needs seeded data + a real session.
- **Dashboard by status** (`e2e/dashboard.spec.ts`): seed an order at each status → assert the
  timeline marks the right active stage, the status message, and the correct action slot
  (upload / proof / video player).
- **Ownership**: seed user A + user B orders → assert A sees only A's.

### Layer C — Real-smoke (gated `@smoke`, local/nightly — NOT in the default CI gate)
- **Full happy-path** (`e2e/smoke/purchase.spec.ts`): real Stripe **test mode** + `stripe listen`
  → configure → pay (`4242…`) → webhook creates the account + order → magic-link sign-in →
  dashboard shows it. The high-fidelity confidence check; run on demand (it needs live services,
  which are flaky in CI). Mirrors the manual verification already done.

### Keep — the 14 vitest tests
Unit/integration (webhook signature + idempotency, checkout-gated account creation, owner-scoped
access, collections, the adapter). These already cover the *real* webhook/DB logic; they get
**repointed at the Neon test branch** (no more flaky local Docker).

## What the suite answers (the must-pass "green flag" set)
| Question | Covered by |
|---|---|
| Site takes payments / correct price | Layer A checkout + vitest `pricing`/`checkout` |
| A real payment creates an account + order | vitest webhook tests + Layer C smoke |
| User can sign in (and only buyers can) | Layer A sign-in UI + vitest auth + Layer C smoke |
| User reaches their dashboard, sees their order | Layer B dashboard + Layer C smoke |
| A user can't see another's order | Layer B ownership + vitest access tests |

## Components
- **Runner:** add `@playwright/test` + `playwright.config.ts`. A **`webServer`** auto-starts the
  app on a **dedicated test port (3100 — never 3000, which is reserved)**. Projects split by
  layer; the `@smoke` tag is **excluded by default**. Trace + screenshot on failure.
- **Auth fixture** (`e2e/fixtures/auth.ts`): a global-setup that seeds a test user and mints a
  Better Auth session **once**, saving `storageState`; Layer-B tests reuse it (no per-test
  magic-link dance). Mechanism: Better Auth server API + Payload Local API (see the
  `better-auth-with-payload` skill).
- **Seed helper** (`e2e/fixtures/seed.ts`): Payload Local API helper to create owners + orders at
  given statuses; isolation via unique keys; optional Neon-branch reset for a clean slate.
- **Stripe in tests:** Layer A mocks `/api/stripe/checkout`; Layer C uses Stripe test mode +
  `stripe listen` per the `stripe:stripe-best-practices` skill. Webhook signature/idempotency
  stays in vitest (signed test events via `generateTestHeaderString`).
- **DB lifecycle:** tests set `DATABASE_URI` = the Neon **test branch** (isolated from prod
  `neondb`). Seed/cleanup per spec; never write test data to prod.
- **CI** (`.github/workflows/test.yml`): on PR → vitest + Layer A + Layer B against the Neon test
  branch (URL as a CI secret); Playwright browsers cached. Layer C is manual/nightly, not a PR
  gate. A green run is the documented signal to promote a PR toward production.
- **Agent-runnable:** the deterministic `npm run test:e2e` is the agent/CI default; the
  `playwright-cli` skill + the Playwright MCP let an agent run, debug, and read traces. Scripts:
  `test` (vitest), `test:e2e` (Layers A+B), `test:e2e:smoke` (Layer C), `test:all`.

## File structure
```
playwright.config.ts
e2e/checkout.spec.ts          # Layer A — configurator → checkout (mocked Stripe)
e2e/sign-in.spec.ts           # Layer A — sign-in UI states
e2e/dashboard.spec.ts         # Layer B — dashboard by status + ownership (seeded)
e2e/smoke/purchase.spec.ts    # Layer C — @smoke real happy-path
e2e/fixtures/auth.ts          # storageState global-setup (seed user + BA session)
e2e/fixtures/seed.ts          # Payload seed helpers (owners, orders by status)
.github/workflows/test.yml    # vitest + Layer A + Layer B on PR
```

## Out of scope (for now)
- Exhaustive coverage of every page/component — this is a **critical-path gate**, not full
  coverage. Add targeted specs as features land.
- Visual-regression / screenshot-diffing.
- Load/perf testing.
- Running Layer C (real Stripe) inside the PR CI gate — kept manual/nightly to avoid flake.

## Prerequisites / verify before build
- **Neon test branch (yours):** create a branch off the project, give me its `DATABASE_URI`
  (local `.env` for tests + a CI secret). This is the stability fix for the Docker flakiness.
- `@playwright/test` + browser binaries installed (`npx playwright install chromium`).
- Stripe **test** keys already in `.env`; Layer C also needs `stripe listen` running locally.
- Consult the installed `playwright-cli`, `stripe:stripe-best-practices`, and
  `better-auth-with-payload` skills during implementation (don't hand-roll patterns).
- Pin the test port to **3100** (3000 is reserved for another project).
