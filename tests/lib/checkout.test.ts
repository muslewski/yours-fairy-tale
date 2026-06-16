import { expect, test } from "vitest";

import { buildCheckoutSessionParams } from "@/lib/checkout";
import { MAX_CHECKOUT_PHOTOS } from "@/lib/order-upload-validation";

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

test("assetPaths are joined into metadata, capped at MAX_CHECKOUT_PHOTOS", () => {
  const paths = Array.from({ length: 8 }, (_, i) => `configurator/p${i}.jpg`);
  const params = buildCheckoutSessionParams({ ...baseInput, assetPaths: paths }, "https://example.com");
  const meta = params.metadata as Record<string, string>;
  const got = meta.assetPaths.split(",").filter(Boolean);
  expect(got).toHaveLength(MAX_CHECKOUT_PHOTOS);
  expect(meta.assetPaths.length).toBeLessThanOrEqual(480);
});

test("no assetPaths → empty metadata value", () => {
  const params = buildCheckoutSessionParams(baseInput, "https://example.com");
  const meta = params.metadata as Record<string, string>;
  expect(meta.assetPaths ?? "").toBe("");
});
