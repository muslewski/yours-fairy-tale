/**
 * order-access-token — pure token shape + 30-day TTL math for the durable
 * reusable order-access link. No DB.
 */
import { describe, expect, test } from "vitest";

import {
  newAccessToken,
  ACCESS_TOKEN_TTL_DAYS,
  accessTokenExpiresAt,
  isAccessTokenLive,
} from "@/lib/order-access-token";

describe("newAccessToken", () => {
  test("is 32 chars of [a-zA-Z]", () => {
    const t = newAccessToken();
    expect(t).toMatch(/^[a-zA-Z]{32}$/);
  });
  test("is non-repeating across calls", () => {
    expect(newAccessToken()).not.toBe(newAccessToken());
  });
});

describe("ttl", () => {
  test("ACCESS_TOKEN_TTL_DAYS is 30", () => {
    expect(ACCESS_TOKEN_TTL_DAYS).toBe(30);
  });
  test("accessTokenExpiresAt is now + 30 days, ISO", () => {
    const now = new Date("2026-06-17T00:00:00.000Z");
    expect(accessTokenExpiresAt(now)).toBe("2026-07-17T00:00:00.000Z");
  });
});

describe("isAccessTokenLive", () => {
  const now = new Date("2026-06-17T12:00:00.000Z");
  test("future expiry → live", () => {
    expect(isAccessTokenLive("2026-07-01T00:00:00.000Z", now)).toBe(true);
  });
  test("past expiry → not live", () => {
    expect(isAccessTokenLive("2026-06-01T00:00:00.000Z", now)).toBe(false);
  });
  test("null / unparseable → not live", () => {
    expect(isAccessTokenLive(null, now)).toBe(false);
    expect(isAccessTokenLive("nope", now)).toBe(false);
  });
});
