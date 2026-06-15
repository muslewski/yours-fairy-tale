import { expect, test } from "@playwright/test";

test("@layerA footer has no fabricated dead links; track-order is real", async ({ page }) => {
  await page.goto("/");
  // Fabricated destinations are gone.
  for (const name of ["Our story", "Reviews", "Careers", "Gift cards"]) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
  // Track your order points at sign-in (the real path to the orders area).
  await expect(
    page.getByRole("link", { name: /track your order/i }),
  ).toHaveAttribute("href", "/sign-in");
});

test("@layerA nav primary CTA is calm 'Start' (no exclamation/emoji)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start", exact: true })).toBeVisible();
  await expect(page.getByText("Start! ⚡")).toHaveCount(0);
});
