import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { simulateDispute, simulateRefund } from "@/tools/agent-mcp/tools/payments";

test("simulate_refund moves the order to refunded", async () => {
  const order = await createOrder({ email: `pay-${Date.now()}@x.io`, length: "short" });
  await simulateRefund(order.paymentIntentId);
  expect((await getOrder(order.orderId))?.status).toBe("refunded");
});

test("simulate_dispute moves the order to cancelled", async () => {
  const order = await createOrder({ email: `pay2-${Date.now()}@x.io`, length: "short" });
  await simulateDispute(order.paymentIntentId);
  expect((await getOrder(order.orderId))?.status).toBe("cancelled");
});
