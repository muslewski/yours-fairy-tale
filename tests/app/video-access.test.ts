/**
 * Video access — TDD for Task 4.4 (the delivered video player's gated route).
 *
 * The delivered film is `order.finalVideo`, a doc in the `media` upload
 * collection whose access is `read: adminOnly`. A customer's browser therefore
 * cannot read it through Payload's normal API. Instead the `<video>` points at
 * an ownership-checked route handler that resolves the file ONLY after proving
 * the signed-in customer owns the order.
 *
 * The security-critical core is `resolveOwnedVideo(orderId)` in
 * lib/video-access.ts: it runs the same `assertOwnsOrder` guard as every
 * mutating action, then resolves `finalVideo` to the media fields the route
 * needs to stream it. This file proves:
 *   1. the OWNER of a delivered order with a finalVideo gets the media back,
 *   2. a NON-owner is rejected (and learns nothing about the file),
 *   3. an unauthenticated caller is rejected,
 *   4. a delivered order with NO finalVideo resolves to null (no crash) for
 *      the owner — so the route can return a gentle 404 / the UI a fallback.
 *
 * DB-backed but network-free, mirroring tests/app/order-actions.test.ts: it
 * boots Payload against local Postgres, creates its own users + orders, and
 * mocks getCustomerSession to inject the caller.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

const mockGetCustomerSession = vi.fn();
vi.mock("@/lib/customer-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/customer-data")>();
  return {
    ...actual,
    getCustomerSession: () => mockGetCustomerSession(),
  };
});

import { getPayloadClient } from "@/lib/payload";
import { resolveOwnedAsset, resolveOwnedVideo } from "@/lib/video-access";

let payload: Awaited<ReturnType<typeof getPayloadClient>>;
let userAId: string;
let userBId: string;
let videoMediaId: string;
const createdOrderIds: string[] = [];
const createdMediaIds: string[] = [];

beforeAll(async () => {
  payload = await getPayloadClient();
  const stamp = Date.now();
  const userA = await payload.create({
    collection: "users",
    data: {
      email: `video-a-${stamp}@example.com`,
      name: "Owner A",
      emailVerified: false,
    },
  });
  const userB = await payload.create({
    collection: "users",
    data: {
      email: `video-b-${stamp}@example.com`,
      name: "Intruder B",
      emailVerified: false,
    },
  });
  userAId = String(userA.id);
  userBId = String(userB.id);

  // A tiny "video" media doc (bytes/mime are arbitrary for the resolver test —
  // we only assert the resolver returns its fields under the ownership gate).
  const media = await payload.create({
    collection: "media",
    data: { alt: "Mia's finished film" },
    file: {
      data: Buffer.from("fake-mp4-bytes"),
      name: "mia-final.mp4",
      mimetype: "video/mp4",
      size: 14,
    },
    overrideAccess: true,
  });
  videoMediaId = String(media.id);
  createdMediaIds.push(videoMediaId);
});

afterAll(async () => {
  for (const id of createdOrderIds) {
    await payload.delete({ collection: "orders", id }).catch(() => {});
  }
  for (const id of createdMediaIds) {
    await payload.delete({ collection: "media", id }).catch(() => {});
  }
  await payload.delete({ collection: "users", id: userAId }).catch(() => {});
  await payload.delete({ collection: "users", id: userBId }).catch(() => {});
});

async function makeDeliveredOrder(finalVideo?: string) {
  const order = await payload.create({
    collection: "orders",
    data: {
      owner: userAId,
      childName: "Mia",
      status: "delivered",
      ...(finalVideo ? { finalVideo } : {}),
    },
  });
  createdOrderIds.push(String(order.id));
  return String(order.id);
}

function sessionFor(userId: string) {
  return { user: { id: userId } };
}

describe("resolveOwnedVideo — ownership gate", () => {
  test("the owner gets the resolved video media", async () => {
    const orderId = await makeDeliveredOrder(videoMediaId);
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    const video = await resolveOwnedVideo(orderId);
    expect(video).not.toBeNull();
    expect(video?.filename).toBe("mia-final.mp4");
    expect(video?.mimeType).toBe("video/mp4");
  });

  test("a non-owner is rejected and learns nothing about the file", async () => {
    const orderId = await makeDeliveredOrder(videoMediaId);
    mockGetCustomerSession.mockResolvedValue(sessionFor(userBId));

    await expect(resolveOwnedVideo(orderId)).rejects.toThrow();
  });

  test("an unauthenticated caller is rejected", async () => {
    const orderId = await makeDeliveredOrder(videoMediaId);
    mockGetCustomerSession.mockResolvedValue(null);

    await expect(resolveOwnedVideo(orderId)).rejects.toThrow();
  });

  test("a delivered order with no finalVideo resolves to null for the owner", async () => {
    const orderId = await makeDeliveredOrder();
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    const video = await resolveOwnedVideo(orderId);
    expect(video).toBeNull();
  });

  test("resolveOwnedVideo can resolve the proof field for the owner", async () => {
    // A proof_ready order whose preview film is `proof` (no finalVideo yet) —
    // the customer's proof player streams through the same ownership gate.
    const order = await payload.create({
      collection: "orders",
      data: {
        owner: userAId,
        childName: "Mia",
        status: "proof_ready",
        proof: videoMediaId,
      },
    });
    createdOrderIds.push(String(order.id));
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    const resolved = await resolveOwnedVideo(String(order.id), "proof");
    expect(resolved?.mimeType).toBe("video/mp4");
    expect(resolved?.filename).toBe("mia-final.mp4");

    // The default field remains finalVideo — and this order has none.
    expect(await resolveOwnedVideo(String(order.id))).toBeNull();
  });
});

describe("resolveOwnedAsset — ownership-gated photo preview", () => {
  test("resolveOwnedAsset returns the preview for an asset on the owner's order", async () => {
    const photo = await payload.create({
      collection: "media",
      data: { alt: "a photo" },
      file: {
        data: Buffer.from("not-a-real-image"),
        name: `a-${Date.now()}.jpg`,
        mimetype: "image/jpeg",
        size: 16,
      },
      overrideAccess: true,
    });
    createdMediaIds.push(String(photo.id));

    const order = await payload.create({
      collection: "orders",
      data: { owner: userAId, childName: "Mia", status: "in_production", assets: [photo.id] },
    });
    createdOrderIds.push(String(order.id));

    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    const resolved = await resolveOwnedAsset(String(order.id), String(photo.id));
    expect(resolved).not.toBeNull();
    expect(resolved?.mimeType).toBeTruthy();
    expect(resolved?.filename).toBeTruthy();

    // An assetId NOT on the order resolves to null even for the owner.
    expect(
      await resolveOwnedAsset(String(order.id), "00000000-0000-0000-0000-000000000000"),
    ).toBeNull();
  });

  test("resolveOwnedAsset throws for a non-owner", async () => {
    const photo = await payload.create({
      collection: "media",
      data: { alt: "p" },
      file: {
        data: Buffer.from("x"),
        name: `p-${Date.now()}.jpg`,
        mimetype: "image/jpeg",
        size: 1,
      },
      overrideAccess: true,
    });
    createdMediaIds.push(String(photo.id));

    const order = await payload.create({
      collection: "orders",
      data: { owner: userAId, childName: "Mia", status: "in_production", assets: [photo.id] },
    });
    createdOrderIds.push(String(order.id));

    mockGetCustomerSession.mockResolvedValue(sessionFor(userBId));
    await expect(resolveOwnedAsset(String(order.id), String(photo.id))).rejects.toThrow();
  });
});
