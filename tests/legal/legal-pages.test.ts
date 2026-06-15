import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

const LEGAL = [
  "app/(site)/(legal)/privacy/page.tsx",
  "app/(site)/(legal)/terms/page.tsx",
  "app/(site)/(legal)/refund/page.tsx",
];

test("legal pages carry no bracketed placeholders", () => {
  for (const f of LEGAL) {
    expect(read(f)).not.toMatch(/\[(registered business name|your governing)/i);
  }
});

test("terms + privacy name the real registered entity", () => {
  const terms = read("app/(site)/(legal)/terms/page.tsx");
  const privacy = read("app/(site)/(legal)/privacy/page.tsx");
  expect(terms).toContain("Firma Dominik Jaworski AI");
  expect(terms).toContain("NIP 5543048002");
  expect(terms).toContain("Poland");
  expect(privacy).toContain("Firma Dominik Jaworski AI");
});
