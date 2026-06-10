import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Layer B — the studio panel. Same out-of-process seeding as dashboard.spec.ts
 * (Payload's config cannot be imported into a Playwright spec). The chromium
 * project carries the CUSTOMER storageState; the studio gate must treat that
 * as signed-out, which the first test pins down. We then sign in as the seeded
 * admin through the real form.
 */
const ADMIN_EMAIL = "e2e-studio-admin@example.com";
const ADMIN_PASSWORD = "e2e-studio-password-1234";

function seedStudio(status: string, child: string) {
  execFileSync(
    "node",
    [
      "--env-file=.env.test",
      "./node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "e2e/fixtures/seed.vitest.config.ts",
    ],
    {
      env: {
        ...process.env,
        E2E_SEED_EMAIL: "e2e-customer@example.com",
        E2E_SEED_STATUS: status,
        E2E_SEED_CHILD: child,
        E2E_SEED_ADMIN_EMAIL: ADMIN_EMAIL,
        E2E_SEED_ADMIN_PASSWORD: ADMIN_PASSWORD,
      },
      stdio: "inherit",
    },
  );
}

test("@layerB the studio gate bounces a customer session to sign-in", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/studio\/sign-in/);
});

test("@layerB studio: sign in, find the order in the queue, advance it", async ({
  page,
}) => {
  seedStudio("paid", "Zelie");

  await page.goto("/studio/sign-in");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText("Needs your attention")).toBeVisible();

  // Open the seeded order from the attention queue.
  await page.getByRole("link").filter({ hasText: "Zelie" }).first().click();
  await expect(page).toHaveURL(/\/studio\/orders\//);
  await expect(page.getByText("The story they ordered")).toBeVisible();

  // Advance paid → in_production via the primary next-step button.
  await page.getByRole("button", { name: "Start production" }).click();
  await expect(page.getByText("In production").first()).toBeVisible();
});
