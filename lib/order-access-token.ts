/**
 * order-access-token — the durable, REUSABLE order-access link's token shape and
 * 30-day TTL, as pure data (no DB). The token is stored on the order and emailed
 * in /open/<token>; isAccessTokenLive gates the route. Unit-tested in
 * tests/lib/order-access-token.test.ts.
 */
import { randomBytes } from "node:crypto";

export const ACCESS_TOKEN_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 32 unguessable chars from [a-zA-Z] (URL-safe; same shape as the randomToken
 *  in the order-tracking-link this supersedes). ~182 bits — no bias concern. */
export function newAccessToken(length = 32): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  }
  return out;
}

/** ISO timestamp 30 days from `now`. */
export function accessTokenExpiresAt(now: Date): string {
  return new Date(now.getTime() + ACCESS_TOKEN_TTL_DAYS * DAY_MS).toISOString();
}

/** Is a stored expiry still in the future? null/unparseable → false. */
export function isAccessTokenLive(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t > now.getTime();
}
