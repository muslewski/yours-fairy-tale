import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("@layerA mobile nav opens a drawer with the full menu", async ({ page }) => {
  await page.goto("/");
  // The desktop nav is hidden at this width; a menu button is present.
  const toggle = page.getByRole("button", { name: /menu/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: /menu/i });
  await expect(drawer.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Series" })).toBeVisible();
  // Closes again.
  await page.getByRole("button", { name: /close menu/i }).click();
  await expect(page.getByRole("dialog", { name: /menu/i })).toHaveCount(0);
});
