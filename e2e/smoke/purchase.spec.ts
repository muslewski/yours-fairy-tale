import { test, expect } from "@playwright/test";
import { readFileSync, existsSync, rmSync } from "node:fs";

/**
 * Layer C — the @smoke real-Stripe happy path (GATED, not part of CI).
 *
 * This drives the WHOLE funnel against a live Stripe TEST account: configure →
 * Stripe-hosted checkout → pay the test card → the `checkout.session.completed`
 * webhook provisions the user + order → sign in via magic link → see the order
 * on /app. Because it leaves the origin and depends on async webhook delivery,
 * it is excluded from the default run (`npm run test:e2e` = `--grep-invert
 * @smoke`) and run on demand with `npm run test:e2e:smoke`.
 *
 * PREREQUISITE — forward live webhooks to the local server before running.
 * Per the `stripe:stripe-best-practices` skill, use the Stripe CLI to relay
 * `checkout.session.completed` to the webhook route. The `whsec_…` secret it
 * prints MUST match `STRIPE_WEBHOOK_SECRET` in `.env.test` (it does):
 *
 *   stripe listen --api-key sk_test_… \
 *     --forward-to localhost:3100/api/stripe/webhook
 *
 * Without the listener the payment succeeds but no user/order is ever created,
 * and step 3 (waitForURL app|sign-in) / step 5 (order card) will time out.
 */

const LINK_FILE = "e2e/.auth/last-magic-link.txt";

// Real purchase happy path starts signed-out: opt out of the chromium
// project's authed storageState.
test.use({ storageState: { cookies: [], origins: [] } });

test("@smoke real Stripe purchase provisions an account and surfaces the order", async ({
  page,
}) => {
  // A unique email per run keeps Stripe Customer dedupe and our user-upsert
  // from colliding with prior smoke runs.
  const email = `smoke-${Date.now()}@example.com`;

  // 1) Configure a video and hand off to Stripe-hosted checkout.
  await page.goto("/#build");
  await page.getByRole("textbox", { name: "Who is it for?" }).fill("Smoke");
  await page.getByRole("button", { name: /Create their video/ }).click();
  await page.waitForURL("https://checkout.stripe.com/**", { timeout: 30_000 });

  // 2) Pay with the Stripe test card on the hosted form.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Card number" }).fill("4242 4242 4242 4242");
  await page.getByRole("textbox", { name: "Expiration" }).fill("12 / 34");
  await page.getByRole("textbox", { name: "CVC" }).fill("123");
  await page.getByRole("textbox", { name: "Cardholder name" }).fill("Smoke Tester");
  await page.getByTestId("hosted-payment-submit-button").click();

  // 3) Stripe redirects back. We may land on /app or bounce to /sign-in (no
  // browser session yet); the webhook provisions the account asynchronously.
  await page.waitForURL(/localhost:3100\/(app|sign-in)/, { timeout: 30_000 });

  // 4) Sign in via magic link, reusing the test-mode sink read pattern from
  // e2e/fixtures/auth.ts. Clear any stale link first, then poll the file.
  if (existsSync(LINK_FILE)) rmSync(LINK_FILE);

  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(email);
  await page.getByRole("button", { name: "Send sign-in link" }).click();

  let url = "";
  for (let i = 0; i < 30 && !url; i++) {
    if (existsSync(LINK_FILE)) url = readFileSync(LINK_FILE, "utf8").trim();
    if (!url) await page.waitForTimeout(500);
  }
  expect(
    url,
    "magic link was not captured to e2e/.auth/last-magic-link.txt",
  ).toMatch(/\/api\/auth\/magic-link\/verify/);

  await page.goto(url); // verify → session cookie → /app
  await expect(page).toHaveURL(/\/app(\b|\/|\?|$)/);

  // 5) The provisioned order is visible on the dashboard.
  await expect(
    page
      .getByRole("article")
      .filter({ hasText: "Smoke's fairy tale" })
      .first(),
  ).toBeVisible({ timeout: 15_000 });
});
