import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA hero shows honest trust copy, not an invented count", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/40,000\+/)).toHaveCount(0);
  await expect(page.getByText(/taking our first orders/i)).toBeVisible();
});
