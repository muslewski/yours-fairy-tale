import { expect, test } from "vitest";
import { buildCheckoutSessionParams } from "@/lib/checkout";

test("builds a session carrying config in metadata + customer_email", () => {
  const p = buildCheckoutSessionParams({ childName: "Ada", world: "space", length: "short", detailLevel: "high", email: "a@b.io" });
  expect(p.mode).toBe("payment");
  expect(p.customer_email).toBe("a@b.io");
  expect(p.metadata).toMatchObject({ childName: "Ada", world: "space" });
  expect(p.line_items?.[0]?.quantity).toBe(1);
  expect(p.success_url).toContain("{CHECKOUT_SESSION_ID}");
});
