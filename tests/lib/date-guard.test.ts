import { expect, test } from "vitest";

import { isPastDate } from "@/lib/date-guard";

const today = "2026-06-16";

test("a date before today is past", () => {
  expect(isPastDate("2026-06-15", today)).toBe(true);
});

test("today is not past", () => {
  expect(isPastDate("2026-06-16", today)).toBe(false);
});

test("a future date is not past", () => {
  expect(isPastDate("2026-06-20", today)).toBe(false);
});

test("an empty value is not flagged", () => {
  expect(isPastDate("", today)).toBe(false);
});
