/**
 * Gating tests — TDD for Task 2.4 (proxy decision helper) and Task 2.6
 * (owner-scoped order reads).
 *
 * Proxy decision helper tests run without a DB — they are pure unit tests.
 * Order-scoping tests use the Payload Local API directly via a testable helper
 * `getOrdersForOwner(ownerId)` (no mocking needed, isolated by created docs).
 */
import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";

// ─── Proxy decision helper ────────────────────────────────────────────────────

// Import the pure helper — not the full proxy (which also sets headers).
// This module is NOT created yet; the test must fail until proxy.ts is written.
import { shouldRedirectToSignIn } from "@/proxy";

describe("proxy decision helper", () => {
  test("no session cookie → should redirect", () => {
    const req = new NextRequest("http://localhost/app/dashboard");
    // No cookie header set at all.
    expect(shouldRedirectToSignIn(req)).toBe(true);
  });

  test("with a session cookie → should NOT redirect", () => {
    const req = new NextRequest("http://localhost/app/dashboard", {
      headers: {
        cookie: "better-auth.session_token=test-token-value",
      },
    });
    expect(shouldRedirectToSignIn(req)).toBe(false);
  });

  test("with an unrelated cookie only → should redirect", () => {
    const req = new NextRequest("http://localhost/app/dashboard", {
      headers: {
        cookie: "some-other-cookie=abc123",
      },
    });
    expect(shouldRedirectToSignIn(req)).toBe(true);
  });
});

// ─── Owner-scoped order reads ─────────────────────────────────────────────────

// `getOrdersForOwner` is a DB-testable helper that takes an ownerId directly,
// so we can test it without mocking the session. `getOrdersForCurrentCustomer`
// calls it; we test the scope invariant at the helper level.
import { getOrdersForOwner } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";

describe("getOrdersForOwner", () => {
  test("returns only orders whose owner matches the given id", async () => {
    const payload = await getPayloadClient();

    // Create two users directly via the Local API.
    const userA = await payload.create({
      collection: "users",
      data: {
        email: `gating-test-a-${Date.now()}@example.com`,
        name: "User A",
        emailVerified: false,
      },
    });
    const userB = await payload.create({
      collection: "users",
      data: {
        email: `gating-test-b-${Date.now()}@example.com`,
        name: "User B",
        emailVerified: false,
      },
    });

    // Create one order per user.
    const orderA = await payload.create({
      collection: "orders",
      data: {
        owner: userA.id,
        childName: "Alice",
        status: "paid",
      },
    });
    await payload.create({
      collection: "orders",
      data: {
        owner: userB.id,
        childName: "Bob",
        status: "paid",
      },
    });

    // Query for user A's orders only.
    const result = await getOrdersForOwner(String(userA.id));

    // Exactly one order, and it is A's.
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(orderA.id);

    // Cleanup: delete orders before users (owner_id is NOT NULL).
    const ordersB = await payload.find({
      collection: "orders",
      where: { owner: { equals: userB.id } },
      overrideAccess: true,
      depth: 0,
    });
    for (const ob of ordersB.docs) {
      await payload.delete({ collection: "orders", id: ob.id });
    }
    await payload.delete({ collection: "orders", id: orderA.id });
    await payload.delete({ collection: "users", id: userA.id });
    await payload.delete({ collection: "users", id: userB.id });
  });
});
