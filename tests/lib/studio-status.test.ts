import { expect, test } from "vitest";

import { isDestructiveStatus } from "@/lib/studio-status";

test("cancelled and refunded are destructive", () => {
  expect(isDestructiveStatus("cancelled")).toBe(true);
  expect(isDestructiveStatus("refunded")).toBe(true);
});

test("normal production statuses are not destructive", () => {
  for (const s of ["paid", "awaiting_assets", "in_production", "proof_ready", "delivered", "approved"]) {
    expect(isDestructiveStatus(s)).toBe(false);
  }
});
