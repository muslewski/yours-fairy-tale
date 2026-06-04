import { test as setup, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, rmSync } from "node:fs";

const EMAIL = "e2e-customer@example.com";
const AUTH_FILE = "e2e/.auth/customer.json";
const LINK_FILE = "e2e/.auth/last-magic-link.txt";

setup("authenticate the test customer", async ({ page }) => {
  // Seed the customer out-of-process. We can't import seed.ts into this fixture:
  // it pulls the Payload config (ESM-only, alias-laden), and Playwright's own
  // transpiler emits CJS that crashes at runtime ("exports is not defined in ES
  // module scope"). Vitest's loader is the one boot path proven on this stack
  // (it powers every DB-touching unit test), so run the seed through a scoped
  // Vitest config. `--env-file=.env.test` points it at the Neon test branch.
  execFileSync(
    "node",
    [
      "--env-file=.env.test",
      "./node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "e2e/fixtures/seed.vitest.config.ts",
    ],
    { stdio: "inherit", env: { ...process.env, E2E_SEED_EMAIL: EMAIL } },
  );
  if (existsSync(LINK_FILE)) rmSync(LINK_FILE); // clear any stale link

  // Request the link through the real UI (correct Origin for BA).
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "Email address" }).fill(EMAIL);
  await page.getByRole("button", { name: "Send sign-in link" }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  // Poll for the captured magic-link URL written by the test-mode sink.
  let url = "";
  for (let i = 0; i < 30 && !url; i++) {
    if (existsSync(LINK_FILE)) url = readFileSync(LINK_FILE, "utf8").trim();
    if (!url) await page.waitForTimeout(500);
  }
  expect(
    url,
    "magic link was not captured to e2e/.auth/last-magic-link.txt",
  ).toMatch(/\/sign-in\/verify/);

  // Simulate an email scanner / link-preview bot fetching the link FIRST. The
  // confirmation interstitial consumes nothing on GET, so this must NOT burn the
  // single-use token (the bug this fixes: a pre-fetch used to cause INVALID_TOKEN).
  await page.request.get(url);

  // Human flow: open the interstitial and press Confirm → real verify → /app.
  await page.goto(url);
  await page.getByRole("button", { name: "Confirm sign-in" }).click();
  await expect(page).toHaveURL(/\/app(\b|\/|\?|$)/);
  await page.context().storageState({ path: AUTH_FILE });
});
