/**
 * Studio-elapsed — pure count-up math + display formatting. No DB, no DOM.
 */
import { describe, expect, test } from "vitest";

import {
  studioElapsed,
  formatStudioElapsed,
  formatStudioElapsedCoarse,
  formatStudioSince,
} from "@/lib/studio-elapsed";

const START = "2026-06-14T10:00:00.000Z";

describe("studioElapsed", () => {
  test("breaks elapsed time into days/hours/minutes/seconds", () => {
    const now = new Date("2026-06-16T16:14:32.000Z"); // 2d 6h 14m 32s later
    expect(studioElapsed(START, now)).toEqual({
      days: 2,
      hours: 6,
      minutes: 14,
      seconds: 32,
      totalMs: (2 * 86400 + 6 * 3600 + 14 * 60 + 32) * 1000,
    });
  });

  test("a future start clamps to zero (never negative)", () => {
    expect(studioElapsed(START, new Date("2026-06-14T09:59:59.000Z")).totalMs).toBe(0);
  });

  test("an unparseable start clamps to zero", () => {
    expect(studioElapsed("not-a-date", new Date()).totalMs).toBe(0);
  });

  test("seconds roll into the next minute", () => {
    const e = studioElapsed(START, new Date("2026-06-14T10:01:00.000Z"));
    expect([e.minutes, e.seconds]).toEqual([1, 0]);
  });
});

describe("formatStudioElapsed", () => {
  test("days form pads h/m/s", () =>
    expect(formatStudioElapsed({ days: 2, hours: 6, minutes: 14, seconds: 32, totalMs: 0 })).toBe(
      "2d 06h 14m 32s",
    ));
  test("under a day drops the days segment", () =>
    expect(formatStudioElapsed({ days: 0, hours: 6, minutes: 14, seconds: 5, totalMs: 0 })).toBe(
      "6h 14m 05s",
    ));
  test("under an hour drops the hours segment", () =>
    expect(formatStudioElapsed({ days: 0, hours: 0, minutes: 14, seconds: 5, totalMs: 0 })).toBe(
      "14m 05s",
    ));
  test("under a minute is seconds only", () =>
    expect(formatStudioElapsed({ days: 0, hours: 0, minutes: 0, seconds: 9, totalMs: 0 })).toBe(
      "9s",
    ));
});

describe("formatStudioElapsedCoarse", () => {
  test("multiple days", () =>
    expect(formatStudioElapsedCoarse({ days: 2, hours: 6, minutes: 0, seconds: 0, totalMs: 0 })).toBe(
      "2 days",
    ));
  test("one day is singular", () =>
    expect(formatStudioElapsedCoarse({ days: 1, hours: 0, minutes: 0, seconds: 0, totalMs: 0 })).toBe(
      "1 day",
    ));
  test("hours", () =>
    expect(formatStudioElapsedCoarse({ days: 0, hours: 5, minutes: 0, seconds: 0, totalMs: 0 })).toBe(
      "about 5 hours",
    ));
  test("under an hour", () =>
    expect(formatStudioElapsedCoarse({ days: 0, hours: 0, minutes: 20, seconds: 0, totalMs: 0 })).toBe(
      "under an hour",
    ));
});

describe("formatStudioSince", () => {
  test("month and day in UTC", () => expect(formatStudioSince(START)).toBe("June 14"));
  test("invalid date yields empty string", () => expect(formatStudioSince("nope")).toBe(""));
});
