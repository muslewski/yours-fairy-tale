/**
 * Build a one-click "track your order" magic link for the order confirmation
 * email.
 *
 * It mints a verification row in the SAME shape Better Auth's magic-link plugin
 * uses (storeToken: "plain" → identifier = the raw token; value = JSON {email};
 * plus expiresAt), so Better Auth's own `/api/auth/magic-link/verify` endpoint
 * consumes it and signs the customer in — no second email, no reinventing verify.
 * The URL is wrapped through `toConfirmSignInUrl` so it lands on the scanner-safe
 * confirmation interstitial, exactly like the sign-in link.
 *
 * A regression test (tests/auth/order-tracking-link.test.ts) drives a generated
 * link through Better Auth's real verify endpoint, so any drift in BA's
 * verification format is caught immediately.
 *
 * Longer TTL than a sign-in link (7 days): an order email may sit in an inbox a
 * while before the parent clicks "track".
 */
import { randomBytes } from "node:crypto";

import { toConfirmSignInUrl } from "@/lib/auth-confirm-url";
import { getPayloadClient } from "@/lib/payload";

const TRACKING_LINK_TTL_DAYS = 7;
const TOKEN_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 32 chars from [a-zA-Z], matching Better Auth's magic-link token shape. */
function randomToken(length = 32): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  return out;
}

export async function createOrderTrackingLink(opts: {
  email: string;
  baseUrl: string;
  callbackURL?: string;
}): Promise<string> {
  const token = randomToken();
  const payload = await getPayloadClient();

  await payload.create({
    collection: "verifications",
    data: {
      identifier: token,
      value: JSON.stringify({ email: opts.email }),
      expiresAt: new Date(
        Date.now() + TRACKING_LINK_TTL_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString(),
    } as never,
    overrideAccess: true,
  });

  const callbackURL = opts.callbackURL ?? "/app";
  const verifyUrl =
    `${opts.baseUrl.replace(/\/$/, "")}/api/auth/magic-link/verify` +
    `?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackURL)}`;

  return toConfirmSignInUrl(verifyUrl);
}
