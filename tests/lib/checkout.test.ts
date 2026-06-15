import { expect, test } from "vitest";

import { buildCheckoutSessionParams } from "@/lib/checkout";

const baseInput = {
  childName: "Mia",
  world: "bedtime" as const,
  length: "medium",
  detail: "basic",
  extraMinutes: 0,
  addOns: ["narration"],
  plotNote: "",
};

test("success_url points at the public /order-confirmed page with the session id", () => {
  const params = buildCheckoutSessionParams(baseInput, "https://example.com");
  expect(params.success_url).toBe(
    "https://example.com/order-confirmed?session={CHECKOUT_SESSION_ID}",
  );
});

test("cancel_url still returns to the configurator", () => {
  const params = buildCheckoutSessionParams(baseInput, "https://example.com");
  expect(params.cancel_url).toBe("https://example.com/#build");
});
