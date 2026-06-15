import { expect, test } from "@playwright/test";

test("@layerA sample section exists and the hero CTA targets it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#sample")).toBeVisible();
  await expect(page.getByText(/sample.*coming soon/i)).toBeVisible();
  const cta = page.getByRole("link", { name: /watch a sample/i }).first();
  await expect(cta).toHaveAttribute("href", "#sample");
});
