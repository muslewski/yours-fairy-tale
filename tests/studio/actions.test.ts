/**
 * Studio mutation core tests — DB-backed. The cores skip the requireStudioUser
 * header check (tested separately in tests/studio/auth.test.ts); guardrails and
 * persistence are what's under test here.
 */
import { describe, expect, test } from "vitest";

import { applyOrderStatusCore, applyPromisedByCore } from "@/lib/studio-actions";
import { getPayloadClient } from "@/lib/payload";

async function seedOrder(status: string) {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: {
      email: `studio-actions-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: true,
    },
    overrideAccess: true,
  });
  const order = await payload.create({
    collection: "orders",
    data: { owner: user.id, status, childName: "Guard" },
    overrideAccess: true,
  });
  return { payload, order };
}

describe("applyOrderStatusCore", () => {
  test("happy path: paid → in_production persists", async () => {
    const { payload, order } = await seedOrder("paid");
    const result = await applyOrderStatusCore(String(order.id), "in_production");
    expect(result).toEqual({ ok: true });
    const fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(fresh.status).toBe("in_production");
  });

  test("guardrail: proof_ready without a proof is rejected, order untouched", async () => {
    const { payload, order } = await seedOrder("in_production");
    const result = await applyOrderStatusCore(String(order.id), "proof_ready");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/preview film/i);
    const fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(fresh.status).toBe("in_production");
  });

  test("guardrail: delivered without a final film is rejected", async () => {
    const { order } = await seedOrder("approved");
    const result = await applyOrderStatusCore(String(order.id), "delivered");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/final film/i);
  });

  test("guardrail passes once the attachment exists", async () => {
    const { payload, order } = await seedOrder("approved");
    const media = await payload.create({
      collection: "media",
      data: { alt: "test film" },
      file: {
        data: Buffer.from("not-really-a-video"),
        name: `guard-final-${Date.now()}.mp4`,
        mimetype: "video/mp4",
        size: 18,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { finalVideo: media.id },
      overrideAccess: true,
    });
    const result = await applyOrderStatusCore(String(order.id), "delivered");
    expect(result).toEqual({ ok: true });
  });

  test("unknown status value is rejected", async () => {
    const { order } = await seedOrder("paid");
    // @ts-expect-error — deliberately invalid input
    const result = await applyOrderStatusCore(String(order.id), "exploded");
    expect(result.ok).toBe(false);
  });
});

describe("applyPromisedByCore", () => {
  test("sets and clears the promise", async () => {
    const { payload, order } = await seedOrder("in_production");
    const iso = "2026-07-01T12:00:00.000Z";
    expect(await applyPromisedByCore(String(order.id), iso)).toEqual({ ok: true });
    let fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(new Date(fresh.promisedBy as string).toISOString()).toBe(iso);

    expect(await applyPromisedByCore(String(order.id), null)).toEqual({ ok: true });
    fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(fresh.promisedBy ?? null).toBeNull();
  });

  test("rejects an unparseable date", async () => {
    const { order } = await seedOrder("in_production");
    const result = await applyPromisedByCore(String(order.id), "not-a-date");
    expect(result.ok).toBe(false);
  });
});
