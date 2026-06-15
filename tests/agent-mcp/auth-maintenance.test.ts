import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { mintLoginLink } from "@/tools/agent-mcp/tools/auth";
import { resetTestDb } from "@/tools/agent-mcp/tools/maintenance";
import { getPayloadClient } from "@/lib/payload";
import { seedCustomer } from "@/e2e/fixtures/seed";

test("mintLoginLink returns a verify URL for the customer", async () => {
  const email = `auth-${Date.now()}@x.io`;
  await createOrder({ email, length: "short" });
  const url = await mintLoginLink(email, "http://localhost:3100");
  expect(url).toContain("token=");
});

test("resetTestDb deletes harness-created orders", async () => {
  const { orderId } = await createOrder({ email: `reset-${Date.now()}@x.io`, length: "short" });
  const removed = await resetTestDb();
  expect(removed.orders).toBeGreaterThanOrEqual(1);
  expect(await getOrder(orderId)).toBeFalsy();
});

test("resetTestDb does NOT delete a non-harness order", async () => {
  const payload = await getPayloadClient();
  const email = `control-${Date.now()}@x.io`;
  const user = await seedCustomer(email);
  const controlOrder = await payload.create({
    collection: "orders",
    data: {
      owner: user.id,
      stripeSessionId: `cs_test_control_${Date.now()}`,
      status: "paid",
    } as never,
    overrideAccess: true,
  });
  const controlId = String(controlOrder.id);

  try {
    await resetTestDb();
    const stillExists = await getOrder(controlId);
    expect(stillExists).toBeTruthy();
  } finally {
    await payload.delete({ collection: "orders", id: controlId, overrideAccess: true });
  }
});
