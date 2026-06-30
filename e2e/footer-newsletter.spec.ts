import { expect, test } from "@playwright/test";

test("@layerA footer newsletter posts the email and confirms", async ({ page }) => {
  let posted: unknown = null;
  await page.route("**/api/waitlist", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/");
  await page.locator("#footer-email").fill("ada@example.com");
  await page.locator("#footer-email").press("Enter");

  // Scope to the footer: a global loading splash also carries role="status".
  await expect(page.locator("footer").getByRole("status")).toContainText(
    /on the list/i,
  );
  expect(posted).toMatchObject({ email: "ada@example.com", source: "footer" });
});
