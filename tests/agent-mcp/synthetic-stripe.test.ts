import { expect, test } from "vitest";

import {
  buildCompletedSessionEvent,
  buildDisputeEvent,
  buildRefundEvent,
} from "@/tools/agent-mcp/lib/synthetic-stripe";

test("completed-session event carries email, ids, and metadata", () => {
  const evt = buildCompletedSessionEvent({
    email: "p@x.io",
    sessionId: "cs_1",
    paymentIntentId: "pi_1",
    metadata: { childName: "Ada", world: "space", length: "short", detailLevel: "detailed" },
  });
  expect(evt.type).toBe("checkout.session.completed");
  expect(evt.livemode).toBe(false);
  const obj = evt.data.object as unknown as Record<string, unknown>;
  expect(obj.id).toBe("cs_1");
  expect(obj.payment_intent).toBe("pi_1");
  expect(obj.customer_email).toBe("p@x.io");
  expect((obj.metadata as Record<string, string>).world).toBe("space");
});

test("refund + dispute events carry the payment_intent", () => {
  const refund = buildRefundEvent("pi_1");
  expect(refund.type).toBe("charge.refunded");
  expect((refund.data.object as unknown as Record<string, unknown>).payment_intent).toBe("pi_1");

  const dispute = buildDisputeEvent("pi_1");
  expect(dispute.type).toBe("charge.dispute.created");
  expect((dispute.data.object as unknown as Record<string, unknown>).payment_intent).toBe("pi_1");
});
