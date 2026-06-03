---
type: plan
summary: "Build the hybrid Playwright suite: @playwright/test runner + config (port 3100), Layer A deterministic specs (mocked checkout + sign-in UI), Layer B DB-backed dashboard specs (Neon test branch + storageState auth), Layer C gated real-Stripe smoke, vitest repointed at the test branch, scripts + CI. The green-flag-for-production gate."
tags: [testing, checkout, auth, payload]
status: planned
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]", "[[auth-gating]]"]
sources: []
implements: "[[2026-06-03-playwright-test-suite-design]]"
produced: []
---

# Playwright E2E Test Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hybrid Playwright suite that acts as the pre-PR-to-production gate — answering "can a customer pay, get an account, and reach their dashboard?" — across Stripe · Payload · Better Auth · Next.js.

**Architecture:** Three layers. **A** = fast deterministic browser tests that mock at our API edge (no DB, no real Stripe). **B** = DB-backed dashboard tests on a Neon test branch with a `storageState` auth fixture. **C** = one gated `@smoke` real-Stripe-test-mode purchase, run on demand. The 14 existing vitest tests are repointed at the Neon test branch. A GitHub Actions workflow gates PRs on vitest + A + B.

**Tech Stack:** `@playwright/test`, Chromium, Next.js 16 (`next start` test server on port 3100), Payload v3 Local API (seeding), Better Auth (magic-link session for the auth fixture), Stripe test mode + `stripe listen` (Layer C only), Neon Postgres branch, GitHub Actions.

---

## Plan conventions (read before executing)

1. **Prerequisite — Neon test branch.** Before Layer B / vitest tasks, the user provides a Neon
   **test-branch** `DATABASE_URI`. Put it in **`.env.test`** (gitignored). Tests load `.env.test`
   (Payload dev-push creates the schema on first boot). NEVER point tests at prod `neondb`.
2. **Port 3100 always.** The Playwright `webServer` and all `baseURL`s use **`http://localhost:3100`**
   (3000 is reserved for another project). Never 3000.
3. **Skills are the API source of truth.** Consult the installed **`playwright-cli`**
   (`.claude/skills/playwright-cli/`), **`stripe:stripe-best-practices`**, and
   **`better-auth-with-payload`** skills for exact current APIs; the code below is the shape.
4. **vitest does NOT typecheck.** After code tasks, run `npx tsc --noEmit` separately to catch type
   errors a passing test run hides.
5. **Commit cadence:** one commit per task. Branch off `main` first: `git checkout -b feat/e2e-tests`.

---

## File structure
```
playwright.config.ts              # runner config: webServer :3100, projects, @smoke excluded
e2e/checkout.spec.ts              # Layer A — configurator → checkout (mocked Stripe)
e2e/sign-in.spec.ts              # Layer A — sign-in UI states (mocked magic-link)
e2e/fixtures/seed.ts             # Payload Local API seed helpers (owners, orders by status)
e2e/fixtures/auth.ts             # storageState setup: seed user → real magic-link → cookie
e2e/dashboard.spec.ts           # Layer B — dashboard by status + ownership (seeded + authed)
e2e/smoke/purchase.spec.ts      # Layer C — @smoke real happy-path
.github/workflows/test.yml      # CI: vitest + Layer A + Layer B on the Neon test branch
.env.test                       # (gitignored) DATABASE_URI=<neon test branch> + test keys
package.json                    # scripts: test, test:e2e, test:e2e:smoke, test:all
```

---

## Phase 0 — Runner setup

### Task 0.1: Install Playwright + scripts
**Files:** Modify `package.json`; create `.env.test`.

- [ ] **Step 1: Install**
```bash
npm i -D @playwright/test
npx playwright install chromium
```
- [ ] **Step 2: Add scripts** to `package.json`:
```json
"test": "vitest run",
"test:e2e": "playwright test --grep-invert @smoke",
"test:e2e:smoke": "playwright test --grep @smoke",
"test:all": "vitest run && playwright test --grep-invert @smoke"
```
- [ ] **Step 3:** Create `.env.test` (gitignored — confirm `.env*` is in `.gitignore`) with the Neon
  **test-branch** URL the user provided + the existing Stripe test keys:
```
DATABASE_URI=postgresql://<neon-test-branch>...
PAYLOAD_SECRET=<copy from .env>
BETTER_AUTH_SECRET=<copy from .env>
NEXT_PUBLIC_APP_URL=http://localhost:3100
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
- [ ] **Step 4: Commit** `git add package.json package-lock.json && git commit -m "chore(test): add @playwright/test + scripts"`

### Task 0.2: `playwright.config.ts`
**Files:** Create `playwright.config.ts`.

- [ ] **Step 1: Write the config** (verify options against the `playwright-cli` skill):
```ts
import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.test" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,            // shared DB — serialize like vitest
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /fixtures\/auth\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/customer.json" },
      dependencies: ["setup"] },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { ...process.env },        // .env.test already loaded above
  },
});
```
Note: `dotenv` may need installing (`npm i -D dotenv`) — it ships transitively with Payload but pin it if the import fails.
- [ ] **Step 2: Verify it loads** `npx playwright test --list 2>&1 | head` → lists specs (no run yet).
- [ ] **Step 3: Commit** `git commit -am "test(e2e): playwright.config on port 3100"`

---

## Phase 1 — Layer A (deterministic, no DB)

### Task 1.1: `e2e/checkout.spec.ts` — configurator → checkout
**Files:** Create `e2e/checkout.spec.ts`. Tag `@layerA` so it can run without the DB/auth setup if needed (see note).

- [ ] **Step 1: Write the spec.** Mocks BOTH our API and the Stripe page so it's fully offline:
```ts
import { test, expect } from "@playwright/test";

// Layer A is DB-free; opt out of the storageState/setup dependency.
test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA configuring a video posts the right selections and redirects to Stripe", async ({ page }) => {
  let posted: Record<string, unknown> | null = null;

  await page.route("**/api/stripe/checkout", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_FAKE" }),
    });
  });
  // Stop the fake Stripe URL from hitting the network.
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<html><body>mock stripe</body></html>" }));

  await page.goto("/#build");
  await page.getByRole("textbox", { name: "Who is it for?" }).fill("Ada");
  await page.getByRole("radio", { name: "Outer space" }).click();
  // defaults: Medium length, Basic detail, Custom narration → metadata below
  await page.getByRole("button", { name: /Create their video/ }).click();

  await page.waitForURL("https://checkout.stripe.com/**");
  expect(posted).toMatchObject({ childName: "Ada", world: "space", length: "medium", detail: "basic" });
  expect((posted as { addOns: string[] }).addOns).toContain("narration");
});
```
(Field/role names verified against the live app in this session: textbox "Who is it for?", radio "Outer space", button "Create their video →".)
- [ ] **Step 2: Run → expect PASS** `npx playwright test e2e/checkout.spec.ts` → 1 passed. (If the request body shape differs, read `app/api/stripe/checkout/route.ts` + `components/home/configurator.tsx` and align the assertion to the real payload keys.)
- [ ] **Step 3: Commit** `git commit -am "test(e2e): Layer A — configurator → checkout (mocked)"`

### Task 1.2: `e2e/sign-in.spec.ts` — sign-in UI states
**Files:** Create `e2e/sign-in.spec.ts`.

- [ ] **Step 1: Write the spec:**
```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA sign-in shows the no-account explainer and the check-your-email state", async ({ page }) => {
  await page.route("**/api/auth/sign-in/magic-link**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: true }) }));

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "No account to create" })).toBeVisible();
  const submit = page.getByRole("button", { name: "Send sign-in link" });
  await expect(submit).toBeDisabled();                       // disabled until email entered
  await page.getByRole("textbox", { name: "Email address" }).fill("ada-parent@example.com");
  await expect(submit).toBeEnabled();
  await submit.click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});
```
- [ ] **Step 2: Run → PASS** `npx playwright test e2e/sign-in.spec.ts`. (Confirm the BA magic-link client path is `/api/auth/sign-in/magic-link` via the network tab or `lib/auth-client.ts`; adjust the route glob if it differs.)
- [ ] **Step 3: Commit** `git commit -am "test(e2e): Layer A — sign-in UI states (mocked)"`

---

## Phase 2 — Layer B (DB-backed: Neon test branch + storageState)

> Requires the Neon test-branch `DATABASE_URI` in `.env.test` (Task 0.1).

### Task 2.1: `e2e/fixtures/seed.ts` — Payload seed helpers
**Files:** Create `e2e/fixtures/seed.ts`.

- [ ] **Step 1: Write the helper** (uses the Payload Local API like `lib/order-actions.ts` does):
```ts
import { getPayloadClient } from "@/lib/payload";
import type { OrderStatus } from "@/lib/order-stages";

export async function seedCustomer(email: string) {
  const p = await getPayloadClient();
  const found = await p.find({ collection: "users", where: { email: { equals: email } }, limit: 1, overrideAccess: true });
  if (found.totalDocs > 0) return found.docs[0];
  return p.create({ collection: "users", data: { email, emailVerified: true }, overrideAccess: true });
}

export async function seedOrder(ownerId: string | number, status: OrderStatus, childName = "Ada") {
  const p = await getPayloadClient();
  return p.create({
    collection: "orders",
    data: { owner: ownerId, status, childName, world: "space",
            stripeSessionId: `cs_seed_${status}_${Date.now()}_${Math.round(performance.now())}` },
    overrideAccess: true,
  });
}
```
- [ ] **Step 2:** No standalone test — it's exercised by Task 2.3. Run `npx tsc --noEmit` → clean.
- [ ] **Step 3: Commit** `git commit -am "test(e2e): Payload seed helpers"`

### Task 2.2: `e2e/fixtures/auth.ts` — storageState setup (real magic-link, no BA-internal guessing)
**Files:** Create `e2e/fixtures/auth.ts`. Output: `e2e/.auth/customer.json` (gitignored).

- [ ] **Step 1: Write the setup** (a Playwright "setup" project test; mirrors the verified manual flow — seed user, request a magic link, read its token from Payload's `verifications`, verify it to get the session cookie, save storageState):
```ts
import { test as setup, expect } from "@playwright/test";
import { getPayloadClient } from "@/lib/payload";
import { seedCustomer } from "./seed";

const EMAIL = "e2e-customer@example.com";
const AUTH_FILE = "e2e/.auth/customer.json";

setup("authenticate the test customer", async ({ page, request }) => {
  await seedCustomer(EMAIL);                                  // account exists (checkout-gated model)

  // Request a magic link (server-side: stores a verification token; in dev it also console.logs the URL).
  await request.post("/api/auth/sign-in/magic-link", { data: { email: EMAIL, callbackURL: "/app" } });

  // Read the freshest magic-link token from Payload's `verifications` collection.
  const p = await getPayloadClient();
  const v = await p.find({ collection: "verifications", sort: "-createdAt", limit: 5, overrideAccess: true });
  const token = extractMagicToken(v.docs, EMAIL);             // helper: BA stores identifier+value; see better-auth skill
  expect(token, "magic-link token not found in verifications").toBeTruthy();

  await page.goto(`/api/auth/magic-link/verify?token=${token}&callbackURL=%2Fapp`);
  await expect(page).toHaveURL(/\/app/);                       // authenticated → gated dashboard
  await page.context().storageState({ path: AUTH_FILE });
});

// BA's magic-link verification record shape may vary by version — confirm field names
// (identifier / value) against the better-auth skill + the `verifications` collection.
function extractMagicToken(docs: Array<Record<string, unknown>>, email: string): string | undefined {
  const row = docs.find((d) => String(d.identifier ?? "").includes(email)) ?? docs[0];
  const value = String(row?.value ?? "");
  return value || undefined;
}
```
- [ ] **Step 2: Run → PASS** `npx playwright test --project=setup` → lands on `/app`, writes `e2e/.auth/customer.json`. Add `e2e/.auth/` to `.gitignore`.

  **⚠ Robustness note (resolve at implementation):** Better Auth may store a **hashed** token in
  `verifications`, in which case you can't rebuild the verify URL from it. The **robust mechanism**
  is to capture the link at its source: in `lib/auth.ts`, the `magicLink` plugin's `sendMagicLink`
  already receives the full `url`. Add a tiny test-only sink — when `process.env.PLAYWRIGHT_TEST === "1"`,
  also write `url` to `e2e/.auth/last-magic-link.txt` (alongside the existing `console.log`). The
  fixture then reads that file instead of querying `verifications`. This is deterministic and
  version-proof. Prefer it; keep the `verifications` read only as a fallback. Set `PLAYWRIGHT_TEST=1`
  in the `webServer.env` (Task 0.2) and `.env.test`.
- [ ] **Step 3: Commit** `git commit -am "test(e2e): storageState auth fixture (magic-link)"`

### Task 2.3: `e2e/dashboard.spec.ts` — dashboard by status + ownership
**Files:** Create `e2e/dashboard.spec.ts`. Uses the authed `storageState` (default project) + seeds.

- [ ] **Step 1: Write the spec:**
```ts
import { test, expect } from "@playwright/test";
import { seedCustomer, seedOrder } from "./fixtures/seed";

const EMAIL = "e2e-customer@example.com";  // same user the auth fixture signed in

test("@layerB dashboard shows a seeded in_production order with the right stage + message", async ({ page }) => {
  const user = await seedCustomer(EMAIL);
  await seedOrder(user.id, "in_production", "Ada");

  await page.goto("/app");
  const card = page.getByRole("article").filter({ hasText: "Ada's fairy tale" }).first();
  await expect(card).toBeVisible();
  await expect(card.getByRole("list", { name: "Production progress" })).toBeVisible();
  await expect(card.getByText("In the studio")).toBeVisible();   // the active stage label
});

test("@layerB a delivered order surfaces the video player slot", async ({ page }) => {
  const user = await seedCustomer(EMAIL);
  await seedOrder(user.id, "delivered", "Bo");
  await page.goto("/app");
  const card = page.getByRole("article").filter({ hasText: "Bo's fairy tale" }).first();
  await expect(card.getByText(/Ready to watch|watch it together|being finalized/i)).toBeVisible();
});
```
(Status→stage labels verified live this session: paid→"Order received", in_production→"In the studio", delivered→"Ready to watch".)
- [ ] **Step 2: Run → PASS** `npx playwright test e2e/dashboard.spec.ts`. Seeds accumulate harmlessly (unique `stripeSessionId`); reset the branch if needed.
- [ ] **Step 3: Commit** `git commit -am "test(e2e): Layer B — dashboard by status"`

---

## Phase 3 — Layer C (gated real smoke)

### Task 3.1: `e2e/smoke/purchase.spec.ts` — real happy-path
**Files:** Create `e2e/smoke/purchase.spec.ts`. Tagged `@smoke` (excluded from the default run).

- [ ] **Step 1: Document the prerequisite in the file header:** Layer C needs `stripe listen
  --api-key sk_test_... --forward-to localhost:3100/api/stripe/webhook` running, and
  `STRIPE_WEBHOOK_SECRET` (the listen secret) in `.env.test`. Per the `stripe:stripe-best-practices`
  skill.
- [ ] **Step 2: Write the spec** (drives the full flow proven manually this session):
```ts
import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });   // start signed-out

test("@smoke a real test-mode purchase creates an account + order reachable on the dashboard", async ({ page, context }) => {
  await page.goto("/#build");
  const email = `smoke-${Date.now()}@example.com`;
  await page.getByRole("textbox", { name: "Who is it for?" }).fill("Smoke");
  await page.getByRole("button", { name: /Create their video/ }).click();
  await page.waitForURL("https://checkout.stripe.com/**");

  // Fill Stripe's hosted test form (selectors verified live this session).
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Card number" }).fill("4242424242424242");
  await page.getByRole("textbox", { name: "Expiration" }).fill("12 / 34");
  await page.getByRole("textbox", { name: "CVC" }).fill("123");
  await page.getByRole("textbox", { name: "Cardholder name" }).fill("Smoke Tester");
  await page.getByTestId("hosted-payment-submit-button").click();

  await page.waitForURL(/localhost:3100\/(app|sign-in)/, { timeout: 30_000 }); // webhook creates the account async
  // Then sign in via the magic link the webhook/sign-in produced — reuse the auth-fixture helper pattern.
  // (Assert the order appears on /app. Detailed steps mirror e2e/fixtures/auth.ts.)
});
```
- [ ] **Step 3: Run locally with `stripe listen` up** `npm run test:e2e:smoke` → passes. (This is the on-demand confidence check; if `stripe listen`/DB aren't up, it's expected to be skipped/failed locally — it is NOT part of the PR gate.)
- [ ] **Step 4: Commit** `git commit -am "test(e2e): Layer C — @smoke real purchase happy-path"`

---

## Phase 4 — vitest on Neon branch + CI

### Task 4.1: Point vitest at the Neon test branch
**Files:** Modify `vitest.config.ts` (or `tests/setup-env.ts`).

- [ ] **Step 1:** Make the vitest env loader prefer `.env.test` when present (so the 14 DB tests use the
  always-on Neon branch instead of local Docker). In `tests/setup-env.ts`, load `.env.test` then `.env`.
- [ ] **Step 2: Run → PASS** `npx vitest run` against the Neon branch → 84 tests pass (no Docker needed).
- [ ] **Step 3: Commit** `git commit -am "test: vitest uses the Neon test branch (.env.test)"`

### Task 4.2: CI workflow
**Files:** Create `.github/workflows/test.yml`.

- [ ] **Step 1: Write the workflow** — on pull_request: install, cache Playwright browsers,
  `npx playwright install --with-deps chromium`, run `npm run test` (vitest) then
  `npm run test:e2e` (Layers A+B). `DATABASE_URI` + `PAYLOAD_SECRET` + `BETTER_AUTH_SECRET` +
  Stripe test keys come from **GitHub Actions secrets** (the Neon test branch URL as a secret). Do
  NOT run `@smoke`. Upload the Playwright HTML report on failure.
- [ ] **Step 2: Verify** the YAML parses (`yamllint` or push a draft PR and read the run).
- [ ] **Step 3: Commit** `git commit -am "ci: run vitest + Playwright A/B on PRs (Neon test branch)"`

---

## Final verification
- [ ] `npm run test:all` green locally (vitest + Layers A+B) against the Neon test branch.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run test:e2e:smoke` passes once locally with `stripe listen` up (manual confidence run).
- [ ] **Mind:** add a `testing` zone card (owns `e2e/**`, `playwright.config.ts`), re-stamp
  `verifiedAt`, add a `map/decisions/` record for the hybrid strategy + Neon-test-branch choice,
  run `npm run mind`, commit.

## Out of scope (per spec)
Visual-regression, load/perf, exhaustive page coverage, and running Layer C inside the PR CI gate.
