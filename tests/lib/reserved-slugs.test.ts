import { describe, it, expect } from "vitest";

import { normalizeSlug, isReservedSlug } from "@/lib/reserved-slugs";

describe("normalizeSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(normalizeSlug("About Us")).toBe("about-us");
    expect(normalizeSlug("  Hello_World  ")).toBe("hello-world");
    expect(normalizeSlug("Crème Brûlée!")).toBe("creme-brulee");
  });
});

describe("isReservedSlug", () => {
  it("rejects real routes and home", () => {
    for (const s of [
      "blog",
      "contact",
      "series",
      "studio",
      "admin",
      "api",
      "",
      "home",
      "1-magic-sparkle",
    ]) {
      expect(isReservedSlug(s)).toBe(true);
    }
  });
  it("allows ordinary slugs", () => {
    for (const s of ["about", "pricing", "how-it-works"]) {
      expect(isReservedSlug(s)).toBe(false);
    }
  });
  it("checks reservation case-insensitively via normalize", () => {
    expect(isReservedSlug("Blog")).toBe(true);
  });
});
