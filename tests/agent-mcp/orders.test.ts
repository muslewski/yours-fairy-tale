import { expect, test } from "vitest";

import { createOrder, getCheckoutIntent, getOrder, listOrders } from "@/tools/agent-mcp/tools/orders";

test("createOrder (webhook mode) materializes a paid order via the real handler", async () => {
  const email = `orders-${Date.now()}@x.io`;
  const res = await createOrder({ email, childName: "Ada", world: "space", length: "short", detailLevel: "detailed" });

  expect(res.orderId).toBeTruthy();
  expect(res.status).toBe("paid");
  expect(res.paymentIntentId).toMatch(/^pi_agent_/);
  expect(res.trackingLink).toContain("token=");

  const order = await getOrder(res.orderId);
  expect(order?.childName).toBe("Ada");
  expect(order?.stripePaymentIntentId).toBe(res.paymentIntentId);
});

test("createOrder honours a status override", async () => {
  const email = `orders2-${Date.now()}@x.io`;
  const res = await createOrder({ email, length: "short", status: "in_production" });
  expect(res.status).toBe("in_production");
});

test("listOrders by email returns the customer's orders", async () => {
  const email = `orders3-${Date.now()}@x.io`;
  await createOrder({ email, length: "short" });
  const list = await listOrders({ email });
  expect(list.length).toBeGreaterThanOrEqual(1);
});

test("getCheckoutIntent returns amount + the real success/cancel URLs", () => {
  const intent = getCheckoutIntent({
    childName: "Ada", world: "space", length: "short", detail: "detailed", extraMinutes: 0, addOns: [],
  });
  expect(typeof intent.amountCents).toBe("number");
  expect(intent.successUrl).toContain("/app?session={CHECKOUT_SESSION_ID}");
  expect(intent.cancelUrl).toContain("/#build");
});
