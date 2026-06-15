import { expect, test } from "vitest";

import { getPayloadClient } from "@/lib/payload";
import { seedCustomer, seedOrder } from "@/e2e/fixtures/seed";
import {
  approveProofCore,
  requestProofChangeCore,
  uploadOrderAssetsCore,
} from "@/lib/order-action-cores";

// 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("uploadOrderAssetsCore appends an asset and advances awaiting_assets -> in_production", async () => {
  const user = await seedCustomer(`cores-${Date.now()}@x.io`);
  const order = await seedOrder(user.id, "awaiting_assets");

  const result = await uploadOrderAssetsCore(String(order.id), [
    { data: PNG_1x1, name: "a.png", mimetype: "image/png", size: PNG_1x1.byteLength },
  ]);
  expect(result.added).toBe(1);

  const p = await getPayloadClient();
  const after = await p.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
  expect(after.status).toBe("in_production");
  expect(Array.isArray(after.assets) ? after.assets.length : 0).toBe(1);
});

test("approveProofCore sets status to approved", async () => {
  const user = await seedCustomer(`cores2-${Date.now()}@x.io`);
  const order = await seedOrder(user.id, "proof_ready");
  await approveProofCore(String(order.id));
  const p = await getPayloadClient();
  const after = await p.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
  expect(after.status).toBe("approved");
});

test("requestProofChangeCore sets revisions + saves the note", async () => {
  const user = await seedCustomer(`cores3-${Date.now()}@x.io`);
  const order = await seedOrder(user.id, "proof_ready");
  await requestProofChangeCore(String(order.id), "Please make the dragon friendlier.");
  const p = await getPayloadClient();
  const after = await p.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
  expect(after.status).toBe("revisions");
  expect(after.revisionNote).toContain("friendlier");
});
