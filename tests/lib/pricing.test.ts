import { describe, expect, test } from "vitest";
import {
  computeTotalCents,
  summarizeSelections,
  MAX_EXTRA_MINUTES,
  type OrderSelections,
} from "@/lib/pricing";

describe("computeTotalCents", () => {
  test("medium + 0 extra + basic + narration is the configurator total", () => {
    // subtotal = 290 (medium) + 0 (extra) + 10 (narration) = 300
    // surcharge = round(300 * (1 - 1)) = 0
    // total = 300 dollars => 30000 cents
    const sel: OrderSelections = {
      length: "medium",
      detail: "basic",
      extraMinutes: 0,
      addOns: ["narration"],
    };
    expect(computeTotalCents(sel)).toBe(30000);
  });

  test("short + 0 extra + basic + no add-ons is the bare base price", () => {
    // 180 dollars => 18000 cents
    expect(
      computeTotalCents({ length: "short", detail: "basic", extraMinutes: 0, addOns: [] }),
    ).toBe(18000);
  });

  test("detail level no longer adds a surcharge (flat multipliers)", () => {
    // long (580) + 5 extra * 55 (275) + narration (10) + music (10) + master (25) = 900
    // all multipliers are 1.0 => surcharge = 0
    // total = 900 dollars => 90000 cents
    const sel: OrderSelections = {
      length: "long",
      detail: "premium",
      extraMinutes: 5,
      addOns: ["narration", "music", "master"],
    };
    expect(computeTotalCents(sel)).toBe(90000);
  });

  test("detailed and premium cost the same as basic while multipliers are flat", () => {
    const base = { length: "medium", extraMinutes: 0, addOns: [] } as const;
    // medium = 290 dollars => 29000 cents, regardless of detail level
    expect(computeTotalCents({ ...base, detail: "basic" })).toBe(29000);
    expect(computeTotalCents({ ...base, detail: "detailed" })).toBe(29000);
    expect(computeTotalCents({ ...base, detail: "premium" })).toBe(29000);
  });

  test("throws on an unknown length", () => {
    expect(() =>
      computeTotalCents({ length: "epic", detail: "basic", extraMinutes: 0, addOns: [] }),
    ).toThrow();
  });

  test("throws on an unknown detail level", () => {
    expect(() =>
      computeTotalCents({ length: "medium", detail: "ultra", extraMinutes: 0, addOns: [] }),
    ).toThrow();
  });

  test("throws on an unknown add-on", () => {
    expect(() =>
      computeTotalCents({
        length: "medium",
        detail: "basic",
        extraMinutes: 0,
        addOns: ["hologram"],
      }),
    ).toThrow();
  });

  test("throws on negative extra minutes", () => {
    expect(() =>
      computeTotalCents({ length: "medium", detail: "basic", extraMinutes: -1, addOns: [] }),
    ).toThrow();
  });

  test("throws on extra minutes over the maximum", () => {
    expect(() =>
      computeTotalCents({
        length: "medium",
        detail: "basic",
        extraMinutes: MAX_EXTRA_MINUTES + 1,
        addOns: [],
      }),
    ).toThrow();
  });

  test("throws on non-integer extra minutes", () => {
    expect(() =>
      computeTotalCents({ length: "medium", detail: "basic", extraMinutes: 2.5, addOns: [] }),
    ).toThrow();
  });
});

describe("summarizeSelections", () => {
  test("produces a human line covering length, minutes, detail, and add-ons", () => {
    const line = summarizeSelections({
      length: "medium",
      detail: "premium",
      extraMinutes: 2,
      addOns: ["narration"],
    });
    expect(line).toContain("Medium");
    expect(line).toContain("7 min"); // 5 base + 2 extra
    expect(line).toContain("Premium");
    expect(line).toContain("Custom narration");
  });

  test("omits the add-ons clause when none are selected", () => {
    const line = summarizeSelections({
      length: "short",
      detail: "basic",
      extraMinutes: 0,
      addOns: [],
    });
    expect(line).toContain("Short");
    expect(line).toContain("3 min");
    expect(line.toLowerCase()).not.toContain("narration");
  });
});
