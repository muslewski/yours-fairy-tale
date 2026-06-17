/**
 * order-access — DB cores for the durable, reusable order-access link
 * (/open/<token>). The durable token lives on the order and is never consumed;
 * each visit re-mints a SHORT-LIVED internal Better Auth magic-link verification
 * (the exact shape BA's verify consumes) so we reuse BA's real verify→session
 * flow instead of hand-rolling sessions. Tested in tests/auth/order-access.test.ts.
 */
import type { PayloadRequest } from "payload";

import { getPayloadClient } from "@/lib/payload";
import {
  newAccessToken,
  accessTokenExpiresAt,
  isAccessTokenLive,
} from "@/lib/order-access-token";

const EPHEMERAL_TTL_MS = 10 * 60 * 1000; // 10 minutes — minted and used in one request

/**
 * Mint (once) or refresh (always) the order's durable access token; returns it.
 *
 * CRITICAL: when called from inside the Orders afterChange hook (the status
 * email), the caller MUST pass that hook's `req`. This update writes the SAME
 * order row the hook is firing for; without the hook's transaction it runs in a
 * separate transaction and blocks forever on the row lock the still-open hook
 * transaction holds (an app-level deadlock → the operation hangs). Passing `req`
 * joins that transaction, so the write reuses the existing lock. The webhook
 * path calls this AFTER its create has committed, so it passes no `req`.
 */
export async function ensureOrderAccessToken(
  orderId: string,
  req?: PayloadRequest,
): Promise<string> {
  const payload = req?.payload ?? (await getPayloadClient());
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const token =
    typeof order.accessToken === "string" && order.accessToken
      ? order.accessToken
      : newAccessToken();
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { accessToken: token, accessTokenExpiresAt: accessTokenExpiresAt(new Date()) },
    overrideAccess: true,
    req,
  });
  return token;
}

/** Resolve a durable token to its order + owner email, or null (unknown/expired). */
export async function resolveOrderByAccessToken(
  token: string,
  now: Date,
): Promise<{ orderId: string; ownerEmail: string } | null> {
  if (!token) return null;
  const payload = await getPayloadClient();
  const found = await payload.find({
    collection: "orders",
    where: { accessToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const order = found.docs[0];
  if (!order) return null;
  if (!isAccessTokenLive((order.accessTokenExpiresAt as string | null) ?? null, now)) {
    return null;
  }
  const ownerId =
    typeof order.owner === "object" && order.owner !== null
      ? String((order.owner as { id: string }).id)
      : order.owner
        ? String(order.owner)
        : null;
  if (!ownerId) return null;
  const owner = await payload.findByID({
    collection: "users",
    id: ownerId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  });
  if (!owner?.email) return null;
  return { orderId: String(order.id), ownerEmail: String(owner.email) };
}

/**
 * Mint a fresh short-lived Better Auth magic-link verification for `email`,
 * returning the token. Same row shape BA's magic-link plugin uses (identifier =
 * raw token, value = JSON {email}, expiresAt). Single-use + 10-min; created and
 * consumed within one /open request.
 */
export async function mintEphemeralSignin(email: string): Promise<string> {
  const token = newAccessToken();
  const payload = await getPayloadClient();
  await payload.create({
    collection: "verifications",
    data: {
      identifier: token,
      value: JSON.stringify({ email }),
      expiresAt: new Date(Date.now() + EPHEMERAL_TTL_MS).toISOString(),
    } as never,
    overrideAccess: true,
  });
  return token;
}
