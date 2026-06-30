import { test, expect } from "@playwright/test";

test("@layerA series waitlist signup posts the email and shows the on-the-list note", async ({ page }) => {
  let posted: unknown = null;
  await page.route("**/api/waitlist", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/series");
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByRole("button", { name: "Notify me" }).click();

  await expect(page.getByRole("status")).toContainText("You are on the list");
  expect(posted).toMatchObject({ email: "ada@example.com" });
});

test("@layerA series waitlist server failure shows a gentle error", async ({ page }) => {
  await page.route("**/api/waitlist", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "We couldn't add you to the list just now. Please try again in a moment.",
      }),
    }));

  await page.goto("/series");
  await page.getByLabel("Email address").fill("ada@example.com");
  await page.getByRole("button", { name: "Notify me" }).click();

  // Target the form's own error node: Next's route announcer is also role="alert".
  await expect(page.locator("#series-waitlist-error")).toContainText(
    "try again in a moment",
  );
});
