import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Layer B — a customer with an awaiting_assets order uploads a photo and then
 * sees it in the "Photos you sent" gallery, served through the gated asset
 * route. Same out-of-process seeding as dashboard.spec.ts.
 */
function seedOrderViaRunner(status: string, child: string) {
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
      },
      stdio: "inherit",
    },
  );
}

test("@layerB a parent uploads a photo and sees it in the gallery", async ({
  page,
}) => {
  seedOrderViaRunner("awaiting_assets", "Pip");

  await page.goto("/app");
  await page
    .getByRole("link")
    .filter({ hasText: "Pip's fairy tale" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/orders\//);

  // Upload a small generated PNG through the photo-upload form.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "pip.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: "Send photos" }).click();

  // The order advances to in_production; the page revalidates and the gallery appears.
  await expect(page.getByText("Photos you sent")).toBeVisible({
    timeout: 30_000,
  });
  const img = page.locator('img[src*="/asset/"]').first();
  await expect(img).toBeVisible();
});
