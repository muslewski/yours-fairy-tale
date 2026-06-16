import { expect, test } from "vitest";

import { safeRelativePath } from "@/lib/safe-redirect";

test("accepts a same-site relative path", () => {
  expect(safeRelativePath("/app/orders/123")).toBe("/app/orders/123");
});

test("rejects protocol-relative and absolute URLs (open-redirect guard)", () => {
  expect(safeRelativePath("//evil.com")).toBe("/app");
  expect(safeRelativePath("https://evil.com")).toBe("/app");
});

test("falls back when empty/null", () => {
  expect(safeRelativePath(null)).toBe("/app");
  expect(safeRelativePath(undefined)).toBe("/app");
  expect(safeRelativePath("")).toBe("/app");
});

test("honors a custom fallback", () => {
  expect(safeRelativePath(null, "/sign-in")).toBe("/sign-in");
});
