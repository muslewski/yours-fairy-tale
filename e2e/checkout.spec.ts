import { test, expect } from "@playwright/test";

// Layer A is DB-free + auth-free: opt out of the storageState the chromium project sets.
test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA configuring a video posts the right selections and redirects to Stripe", async ({ page }) => {
  let posted: Record<string, unknown> | null = null;

  await page.route("**/api/stripe/checkout", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://checkout.stripe.com/c/pay/cs_test_FAKE" }),
    });
  });

  // Keep the fake Stripe URL off the network.
  await page.route("https://checkout.stripe.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>mock stripe</body></html>",
    })
  );

  await page.goto("/#build");

  // Fill child name
  await page.getByRole("textbox", { name: "Who is it for?" }).fill("Ada");

  // Select world: "Outer space" (id="space").
  // The radio is sr-only inside a <label> — click the label itself.
  await page.locator("label").filter({ hasText: "Outer space" }).first().click();

  // defaults: length="medium", detail="basic", addOns=["narration"], extraMinutes=0

  await page.getByRole("button", { name: /Create their video/ }).click();

  await page.waitForURL("https://checkout.stripe.com/**");

  expect(posted).toMatchObject({
    childName: "Ada",
    world: "space",
    length: "medium",
    detail: "basic",
    extraMinutes: 0,
  });
  expect((posted as unknown as { addOns?: string[] })?.addOns ?? []).toContain("narration");
});
