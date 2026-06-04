/**
 * addOrderNote appends a customer note to an order. We test the DB-facing core
 * (validation + append) via a testable helper that takes an explicit ownerId,
 * mirroring how getOrdersForOwner is unit-tested without a session.
 */
import { describe, expect, test } from "vitest";

import { appendCustomerNote } from "@/lib/order-actions";
import { MAX_NOTE_LENGTH } from "@/lib/order-notes-shared";
import { getPayloadClient } from "@/lib/payload";

describe("appendCustomerNote", () => {
  test("rejects empty and oversized messages", async () => {
    expect((await appendCustomerNote("1", "   ")).ok).toBe(false);
    expect((await appendCustomerNote("1", "x".repeat(MAX_NOTE_LENGTH + 1))).ok).toBe(false);
  });

  test("appends a row, preserving existing notes", async () => {
    const payload = await getPayloadClient();
    const user = await payload.create({
      collection: "users",
      data: { email: `note-${Date.now()}@example.com`, name: "N", emailVerified: false },
    });
    const order = await payload.create({
      collection: "orders",
      data: {
        owner: user.id,
        childName: "Nia",
        status: "paid",
        customerNotes: [{ message: "first", createdAt: new Date().toISOString() }],
      },
    });

    const result = await appendCustomerNote(String(order.id), "  second  ");
    expect(result.ok).toBe(true);

    const updated = await payload.findByID({ collection: "orders", id: order.id, depth: 0 });
    const notes = updated.customerNotes as { message: string }[];
    expect(notes.map((n) => n.message)).toEqual(["first", "second"]);

    await payload.delete({ collection: "orders", id: order.id });
    await payload.delete({ collection: "users", id: user.id });
  });
});
