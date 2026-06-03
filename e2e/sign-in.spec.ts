import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } }); // start signed-out

test("@layerA sign-in shows the no-account explainer and the check-your-email state", async ({ page }) => {
  await page.route("**/api/auth/sign-in/magic-link**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: true }) }));

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "No account to create" })).toBeVisible();

  const placeOrder = page.getByRole("link", { name: "Place an order" });
  await expect(placeOrder).toBeVisible();
  await expect(placeOrder).toHaveAttribute("href", "/#build");

  const submit = page.getByRole("button", { name: "Send sign-in link" });
  await expect(submit).toBeDisabled();
  await page.getByRole("textbox", { name: "Email address" }).fill("ada-parent@example.com");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});
