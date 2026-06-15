import { handleStripeEvent } from "@/app/api/stripe/webhook/route";

import { buildDisputeEvent, buildRefundEvent } from "../lib/synthetic-stripe";

export async function simulateRefund(paymentIntentId: string): Promise<{ ok: true }> {
  await handleStripeEvent(buildRefundEvent(paymentIntentId));
  return { ok: true };
}

export async function simulateDispute(paymentIntentId: string): Promise<{ ok: true }> {
  await handleStripeEvent(buildDisputeEvent(paymentIntentId));
  return { ok: true };
}
