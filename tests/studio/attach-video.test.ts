/**
 * Metadata-only media creation + attach core — DB-backed.
 * Proves upload.filesRequiredOnCreate: false lets the studio register a blob
 * that was uploaded client-side (no file buffer through the server), and that
 * attachVideoCore links it to the right order slot.
 */
import { afterAll, describe, expect, test } from "vitest";

import { attachVideoCore } from "@/lib/studio-order-mutations";
import { getPayloadClient } from "@/lib/payload";

const created: { collection: "users" | "orders" | "media"; id: string }[] = [];

afterAll(async () => {
  const payload = await getPayloadClient();
  for (const doc of created.reverse()) {
    await payload
      .delete({ collection: doc.collection, id: doc.id, overrideAccess: true })
      .catch(() => {});
  }
});

async function seedOrder() {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: {
      email: `attach-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: true,
    },
    overrideAccess: true,
  });
  created.push({ collection: "users", id: String(user.id) });
  const order = await payload.create({
    collection: "orders",
    data: { owner: user.id, status: "in_production", childName: "Clip" },
    overrideAccess: true,
  });
  created.push({ collection: "orders", id: String(order.id) });
  return { payload, order };
}

describe("attachVideoCore", () => {
  test("creates a metadata-only media doc and links it as the proof", async () => {
    const { payload, order } = await seedOrder();
    const pathname = `${order.id}-proof-${Date.now()}.mp4`;

    const result = await attachVideoCore({
      orderId: String(order.id),
      kind: "proof",
      blob: { pathname, contentType: "video/mp4", size: 1234567 },
    });
    expect(result).toEqual({ ok: true });

    const fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 1,
      overrideAccess: true,
    });
    const proof = fresh.proof as { id?: string; filename?: string; mimeType?: string; filesize?: number };
    if (proof?.id) created.push({ collection: "media", id: String(proof.id) });
    expect(proof?.filename).toBe(pathname);
    expect(proof?.mimeType).toBe("video/mp4");
    expect(proof?.filesize).toBe(1234567);
  });

  test("rejects non-video content types", async () => {
    const { order } = await seedOrder();
    const result = await attachVideoCore({
      orderId: String(order.id),
      kind: "finalVideo",
      blob: { pathname: "x.txt", contentType: "text/plain", size: 10 },
    });
    expect(result.ok).toBe(false);
  });

  test("rejects an unknown kind", async () => {
    const { order } = await seedOrder();
    const result = await attachVideoCore({
      orderId: String(order.id),
      // @ts-expect-error — deliberately invalid
      kind: "assets",
      blob: { pathname: "x.mp4", contentType: "video/mp4", size: 10 },
    });
    expect(result.ok).toBe(false);
  });
});
