import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import {
  addCustomerNote,
  approveProofTool,
  requestProofChangeTool,
  uploadPhotos,
} from "@/tools/agent-mcp/tools/customer";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("uploadPhotos reads files from disk and attaches them", async () => {
  const { orderId } = await createOrder({ email: `cust-${Date.now()}@x.io`, length: "short", status: "awaiting_assets" });
  const dir = mkdtempSync(join(tmpdir(), "agent-mcp-"));
  const file = join(dir, "child.png");
  writeFileSync(file, PNG_1x1);

  const res = await uploadPhotos(orderId, [file]);
  expect(res.added).toBe(1);

  const order = await getOrder(orderId);
  expect(order?.status).toBe("in_production");
});

test("approve / revise / note drive customer-side state", async () => {
  const { orderId } = await createOrder({ email: `cust2-${Date.now()}@x.io`, length: "short", status: "proof_ready" });

  await requestProofChangeTool(orderId, "Make it brighter.");
  expect((await getOrder(orderId))?.status).toBe("revisions");

  await approveProofTool(orderId);
  expect((await getOrder(orderId))?.status).toBe("approved");

  const noteRes = await addCustomerNote(orderId, "Thank you!");
  expect(noteRes.ok).toBe(true);
});
