/**
 * Customer data bridge — server-only.
 *
 * This is the single doorway through which customer-facing code reads their
 * data. Every query is scoped to the authenticated user's id via an explicit
 * `where` clause. We do NOT rely on Payload's `req.user` because Better Auth
 * sessions are not automatically surfaced there. The pattern mirrors delieta's
 * `dashboard-data.ts`: explicit `where` + `overrideAccess: true`.
 *
 * Two helpers are exported:
 *  - `getCustomerSession()` — resolves the BA session from Next.js headers.
 *  - `getOrdersForOwner(ownerId)` — testable helper that queries Payload
 *    directly, scoped by owner id. Unit-tested in tests/auth/gating.test.ts.
 *  - `getOrdersForCurrentCustomer()` — composes the two above; used in server
 *    components.
 */
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getPayloadClient } from "@/lib/payload";

/** The Better Auth session for the current request, or null if unauthenticated. */
export async function getCustomerSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Fetch all orders whose `owner` field equals `ownerId`.
 *
 * Uses `overrideAccess: true` so the Payload Local API skips the adminOnly
 * access rule on the Orders collection. The owner scope is enforced by the
 * explicit `where` — it is visible at the call site, not hidden behind an
 * access-control re-derivation.
 *
 * Exported separately from `getOrdersForCurrentCustomer` so it can be tested
 * directly with DB-created users without needing to mock the session.
 */
export async function getOrdersForOwner(ownerId: string) {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "orders",
    where: {
      owner: { equals: ownerId },
    },
    overrideAccess: true,
    depth: 0,
    // A customer must see ALL their orders — Payload's find() defaults to a
    // 10-doc page, which silently hid the 11th order.
    pagination: false,
    sort: "-createdAt",
  });
  return result.docs;
}

/**
 * Returns orders belonging to the currently signed-in customer.
 * Returns an empty array when there is no active session.
 */
export async function getOrdersForCurrentCustomer() {
  const session = await getCustomerSession();
  if (!session) return [];
  return getOrdersForOwner(session.user.id);
}

/**
 * Fetch a single order by id, but ONLY if `ownerId` owns it. Returns the doc or
 * null (unknown id, or owned by someone else). The owner scope is an explicit
 * part of the query — the security boundary for the order detail page. Unknown
 * ids never throw: a bad id reads as "not found".
 */
export async function getOrderForOwner(ownerId: string, orderId: string) {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "orders",
    where: {
      and: [{ id: { equals: orderId } }, { owner: { equals: ownerId } }],
    },
    overrideAccess: true,
    depth: 0,
    limit: 1,
  });
  return result.docs[0] ?? null;
}

/**
 * Returns the given order if it belongs to the currently signed-in customer,
 * else null (no session, or not theirs).
 */
export async function getOrderForCurrentCustomer(orderId: string) {
  const session = await getCustomerSession();
  if (!session) return null;
  return getOrderForOwner(session.user.id, orderId);
}
