/**
 * in-studio-stamp — the pure "stamp inStudioSince once" decision, reused at
 * every site that moves an order into production. No DB.
 */
import { describe, expect, test } from "vitest";

import { inStudioStamp } from "@/lib/in-studio-stamp";

const NOW = new Date("2026-06-16T12:00:00.000Z");

describe("inStudioStamp", () => {
  test("stamps when entering in_production with no prior stamp", () => {
    expect(
      inStudioStamp({ nextStatus: "in_production", currentInStudioSince: null, now: NOW }),
    ).toEqual({ inStudioSince: NOW.toISOString() });
  });

  test("does not re-stamp when already stamped (re-entry keeps the original)", () => {
    expect(
      inStudioStamp({
        nextStatus: "in_production",
        currentInStudioSince: "2026-06-14T10:00:00.000Z",
        now: NOW,
      }),
    ).toEqual({});
  });

  test("does not stamp for non-production statuses", () => {
    expect(
      inStudioStamp({ nextStatus: "proof_ready", currentInStudioSince: null, now: NOW }),
    ).toEqual({});
  });
});
