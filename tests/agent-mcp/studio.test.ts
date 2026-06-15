import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { attachFinalVideo, attachProof, setPromisedBy, setStatus } from "@/tools/agent-mcp/tools/studio";

test("set_status to proof_ready is blocked until a proof is attached", async () => {
  const { orderId } = await createOrder({ email: `studio-${Date.now()}@x.io`, length: "short", status: "in_production" });

  const blocked = await setStatus(orderId, "proof_ready");
  expect(blocked.ok).toBe(false);

  const proof = await attachProof(orderId);
  expect(proof.ok).toBe(true);

  const ok = await setStatus(orderId, "proof_ready");
  expect(ok.ok).toBe(true);
  expect((await getOrder(orderId))?.status).toBe("proof_ready");
});

test("attach_final_video enables delivered; set_promised_by stores a date", async () => {
  const { orderId } = await createOrder({ email: `studio2-${Date.now()}@x.io`, length: "short", status: "approved" });

  expect((await setStatus(orderId, "delivered")).ok).toBe(false);
  expect((await attachFinalVideo(orderId)).ok).toBe(true);
  expect((await setStatus(orderId, "delivered")).ok).toBe(true);

  const iso = new Date("2026-07-01T00:00:00.000Z").toISOString();
  expect((await setPromisedBy(orderId, iso)).ok).toBe(true);
});
