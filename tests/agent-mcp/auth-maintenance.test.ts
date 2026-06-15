import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { mintLoginLink } from "@/tools/agent-mcp/tools/auth";
import { resetTestDb } from "@/tools/agent-mcp/tools/maintenance";

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
