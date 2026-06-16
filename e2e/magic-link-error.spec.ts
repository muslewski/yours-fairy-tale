import { expect, test } from "@playwright/test";

test("@layerA expired magic-link page explains and offers a fresh link", async ({ page }) => {
  await page.goto("/sign-in/verify/error?error=INVALID_TOKEN");
  await expect(
    page.getByRole("heading", { name: /expired or was already used/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /request a new link/i })).toHaveAttribute(
    "href",
    "/sign-in",
  );
});
