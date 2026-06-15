import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA order-confirmed page reassures and sets email expectations", async ({
  page,
}) => {
  await page.goto("/order-confirmed?session=cs_test_123");
  await expect(
    page.getByRole("heading", { name: /your order is confirmed/i }),
  ).toBeVisible();
  await expect(page.getByText(/spam or promotions folder/i)).toBeVisible();
  // Signed-out visitor is routed to sign-in to track the order.
  await expect(
    page.getByRole("link", { name: /sign in to track your order/i }),
  ).toBeVisible();
});
