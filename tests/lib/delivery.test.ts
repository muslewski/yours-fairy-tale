/**
 * Delivery-promise model tests — pure date math, no DB, no DOM.
 */
import { describe, expect, test } from "vitest";

import {
  PRODUCTION_DAYS,
  promisedByForLength,
  countdownState,
  formatPromisedDate,
} from "@/lib/delivery";

const NOW = new Date("2026-06-10T12:00:00.000Z");

describe("promisedByForLength", () => {
  test("maps each length to its production window", () => {
    expect(PRODUCTION_DAYS).toEqual({ short: 7, medium: 14, long: 21 });
    expect(promisedByForLength("short", NOW)?.toISOString()).toBe(
      "2026-06-17T12:00:00.000Z",
    );
    expect(promisedByForLength("medium", NOW)?.toISOString()).toBe(
      "2026-06-24T12:00:00.000Z",
    );
    expect(promisedByForLength("long", NOW)?.toISOString()).toBe(
      "2026-07-01T12:00:00.000Z",
    );
  });

  test("unknown or missing length yields no promise", () => {
    expect(promisedByForLength(undefined, NOW)).toBeNull();
    expect(promisedByForLength("epic", NOW)).toBeNull();
    expect(promisedByForLength(null, NOW)).toBeNull();
  });
});

describe("countdownState", () => {
  const base = {
    createdAt: "2026-06-06T12:00:00.000Z",
    now: NOW,
  };

  test("hidden without a promise, on terminal statuses, and on delivery", () => {
    expect(
      countdownState({ ...base, status: "in_production", promisedBy: null }),
    ).toEqual({ kind: "hidden" });
    for (const status of ["delivered", "refunded", "cancelled"] as const) {
      expect(
        countdownState({
          ...base,
          status,
          promisedBy: "2026-06-20T12:00:00.000Z",
        }),
      ).toEqual({ kind: "hidden" });
    }
    expect(
      countdownState({ ...base, status: "paid", promisedBy: "not-a-date" }),
    ).toEqual({ kind: "hidden" });
  });

  test("counting: days remaining + fraction of the window elapsed", () => {
    const state = countdownState({
      ...base,
      status: "in_production",
      promisedBy: "2026-06-20T12:00:00.000Z", // 10 days out of a 14-day window
    });
    expect(state.kind).toBe("counting");
    if (state.kind === "counting") {
      expect(state.days).toBe(10);
      // 4 of 14 days elapsed
      expect(state.fractionElapsed).toBeCloseTo(4 / 14, 5);
    }
  });

  test("under a day remaining reads as soon, past the date reads as overdue", () => {
    expect(
      countdownState({
        ...base,
        status: "approved",
        promisedBy: "2026-06-11T06:00:00.000Z", // 18h away
      }).kind,
    ).toBe("soon");
    expect(
      countdownState({
        ...base,
        status: "approved",
        promisedBy: "2026-06-09T12:00:00.000Z", // passed
      }).kind,
    ).toBe("overdue");
  });
});

describe("formatPromisedDate", () => {
  test("renders the calm long form in UTC", () => {
    expect(formatPromisedDate(new Date("2026-06-20T12:00:00.000Z"))).toBe(
      "Saturday, June 20",
    );
  });
});
