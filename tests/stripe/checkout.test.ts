import { expect, test } from "vitest";
import { buildCheckoutSessionParams } from "@/lib/checkout";
import { computeTotalCents, DEFAULT_PRICING } from "@/lib/pricing";

test("charge uses injected pricing when provided (3rd arg)", () => {
  const pricing = {
    ...DEFAULT_PRICING,
    lengths: DEFAULT_PRICING.lengths.map((l) => (l.id === "short" ? { ...l, price: 500 } : l)),
  };
  const p = buildCheckoutSessionParams(
    { childName: "", world: "bedtime", length: "short", detail: "basic", extraMinutes: 0, addOns: [] },
    undefined,
    pricing,
  );
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(50000);
});

test("builds a session carrying config in metadata + customer_email", () => {
  const p = buildCheckoutSessionParams({
    childName: "Ada",
    world: "space",
    length: "short",
    detail: "basic",
    extraMinutes: 2,
    addOns: ["narration", "music"],
    plotNote: "A brave knight who loves cats.",
    email: "a@b.io",
  });
  expect(p.mode).toBe("payment");
  expect(p.customer_email).toBe("a@b.io");
  expect(p.metadata).toMatchObject({
    childName: "Ada",
    world: "space",
    length: "short",
    detailLevel: "basic",
    extraMinutes: "2",
    addOns: "narration,music",
    plotNote: "A brave knight who loves cats.",
  });
  expect(p.line_items?.[0]?.quantity).toBe(1);
  expect(p.success_url).toContain("{CHECKOUT_SESSION_ID}");
});

test("enables the promotion-code field so buyers can redeem coupons", () => {
  const p = buildCheckoutSessionParams({
    childName: "",
    world: "bedtime",
    length: "short",
    detail: "basic",
    extraMinutes: 0,
    addOns: [],
  });
  expect(p.allow_promotion_codes).toBe(true);
});

test("plotNote is capped to Stripe's 500-char metadata limit", () => {
  const long = "x".repeat(600);
  const p = buildCheckoutSessionParams({
    childName: "",
    world: "custom",
    length: "short",
    detail: "basic",
    extraMinutes: 0,
    addOns: [],
    plotNote: long,
  });
  expect((p.metadata?.plotNote as string).length).toBe(500);
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
  // long 580 + 5×55 (275) + narration 10 + music 10 + master 25 = 900; flat multipliers → no surcharge
  expect(expected).toBe(90000);
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
  expect(cheap.line_items?.[0]?.price_data?.unit_amount).toBe(18000);
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
  // medium 290 + narration 10 = 300
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(30000);
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
