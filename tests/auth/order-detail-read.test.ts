/**
 * Owner-scoped single-order read. getOrderForOwner(ownerId, orderId) must return
 * the doc ONLY when that owner owns it, and null otherwise (wrong owner / unknown
 * id) — the security boundary for the /app/orders/[id] detail page.
 */
import { describe, expect, test } from "vitest";

import { getOrderForOwner } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";

describe("getOrderForOwner", () => {
  test("returns the order for its owner, null for a non-owner or unknown id", async () => {
    const payload = await getPayloadClient();

    const userA = await payload.create({
      collection: "users",
      data: { email: `odr-a-${Date.now()}@example.com`, name: "A", emailVerified: false },
    });
    const userB = await payload.create({
      collection: "users",
      data: { email: `odr-b-${Date.now()}@example.com`, name: "B", emailVerified: false },
    });
    const orderA = await payload.create({
      collection: "orders",
      data: { owner: userA.id, childName: "Alice", status: "paid" },
    });

    const owned = await getOrderForOwner(String(userA.id), String(orderA.id));
    expect(owned?.id).toBe(orderA.id);

    const notOwned = await getOrderForOwner(String(userB.id), String(orderA.id));
    expect(notOwned).toBeNull();

    const missing = await getOrderForOwner(String(userA.id), "999999");
    expect(missing).toBeNull();

    await payload.delete({ collection: "orders", id: orderA.id });
    await payload.delete({ collection: "users", id: userA.id });
    await payload.delete({ collection: "users", id: userB.id });
  });
});
