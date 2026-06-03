import { expect, test } from "vitest";
import { buildCheckoutSessionParams } from "@/lib/checkout";
import { computeTotalCents } from "@/lib/pricing";

test("builds a session carrying config in metadata + customer_email", () => {
  const p = buildCheckoutSessionParams({
    childName: "Ada",
    world: "space",
    length: "short",
    detail: "basic",
    extraMinutes: 0,
    addOns: [],
    email: "a@b.io",
  });
  expect(p.mode).toBe("payment");
  expect(p.customer_email).toBe("a@b.io");
  expect(p.metadata).toMatchObject({ childName: "Ada", world: "space", length: "short", detailLevel: "basic" });
  expect(p.line_items?.[0]?.quantity).toBe(1);
  expect(p.success_url).toContain("{CHECKOUT_SESSION_ID}");
});

test("prices the line item from the selections — server-computed, never client-supplied", () => {
  const sel = {
    childName: "Ada",
    world: "space" as const,
    length: "long",
    detail: "premium",
    extraMinutes: 5,
    addOns: ["narration", "music", "master"],
  };
  const p = buildCheckoutSessionParams(sel);

  // The builder must recompute the amount itself — equal to the shared pricing fn.
  const expected = computeTotalCents({
    length: sel.length,
    detail: sel.detail,
    extraMinutes: sel.extraMinutes,
    addOns: sel.addOns,
  });
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(expected);
  expect(expected).toBe(201500);
  expect(p.line_items?.[0]?.price_data?.currency).toBe("usd");
  expect(typeof p.line_items?.[0]?.price_data?.product_data?.name).toBe("string");
});

test("a tampered/forged price has no path in — the builder only takes selections", () => {
  // Even if a caller tried to smuggle a price, the type only carries selections;
  // the amount comes purely from computeTotalCents(selections).
  const cheap = buildCheckoutSessionParams({
    childName: "",
    world: "bedtime",
    length: "short",
    detail: "basic",
    extraMinutes: 0,
    addOns: [],
  });
  expect(cheap.line_items?.[0]?.price_data?.unit_amount).toBe(30000);
});

test("empty childName is allowed (parent can add it later)", () => {
  const p = buildCheckoutSessionParams({
    childName: "",
    world: "forest",
    length: "medium",
    detail: "basic",
    extraMinutes: 0,
    addOns: ["narration"],
  });
  expect(p.metadata).toMatchObject({ childName: "", world: "forest" });
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(51000);
});

test("invalid selections throw (so the route can answer 400)", () => {
  expect(() =>
    buildCheckoutSessionParams({
      childName: "Ada",
      world: "space",
      length: "nonsense",
      detail: "basic",
      extraMinutes: 0,
      addOns: [],
    }),
  ).toThrow();
});
