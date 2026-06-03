import { describe, expect, test } from "vitest";
import {
  computeTotalCents,
  summarizeSelections,
  MAX_EXTRA_MINUTES,
  type OrderSelections,
} from "@/lib/pricing";

describe("computeTotalCents", () => {
  test("medium + 0 extra + basic + narration matches the old configurator total", () => {
    // subtotal = 450 (medium) + 0 (extra) + 60 (narration) = 510
    // surcharge = round(510 * (1 - 1)) = 0
    // total = 510 dollars => 51000 cents
    const sel: OrderSelections = {
      length: "medium",
      detail: "basic",
      extraMinutes: 0,
      addOns: ["narration"],
    };
    expect(computeTotalCents(sel)).toBe(51000);
  });

  test("short + 0 extra + basic + no add-ons is the bare base price", () => {
    // 300 dollars => 30000 cents
    expect(
      computeTotalCents({ length: "short", detail: "basic", extraMinutes: 0, addOns: [] }),
    ).toBe(30000);
  });

  test("applies the detail multiplier to the full subtotal, rounded", () => {
    // long (900) + 5 extra * 100 (500) + narration (60) + music (40) + master (50) = 1550
    // premium multiplier 1.3 => surcharge = round(1550 * 0.3) = 465
    // total = 2015 dollars => 201500 cents
    const sel: OrderSelections = {
      length: "long",
      detail: "premium",
      extraMinutes: 5,
      addOns: ["narration", "music", "master"],
    };
    expect(computeTotalCents(sel)).toBe(201500);
  });

  test("detailed multiplier rounds the surcharge to whole dollars", () => {
    // medium (450) + 0 + no add-ons = 450
    // detailed 1.1 => surcharge = round(450 * 0.1) = 45 => total 495 dollars => 49500 cents
    expect(
      computeTotalCents({ length: "medium", detail: "detailed", extraMinutes: 0, addOns: [] }),
    ).toBe(49500);
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
