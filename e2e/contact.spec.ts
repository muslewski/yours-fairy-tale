import { test, expect } from "@playwright/test";

test("@layerA contact form submits and shows the success state", async ({ page }) => {
  await page.route("**/api/contact", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    }));

  await page.goto("/contact");
  await page.getByLabel("Your name").fill("Ada Parent");
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByLabel("Message").fill("When will my order be ready?");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByText("Thanks — we've got your message")).toBeVisible();
});

test("@layerA footer 'Contact us' link points at /contact", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Contact us" });
  await expect(link).toHaveAttribute("href", "/contact");
});
