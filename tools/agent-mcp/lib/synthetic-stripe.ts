import type Stripe from "stripe";

/**
 * Build synthetic, livemode:false Stripe events that exercise the REAL
 * handleStripeEvent paths. Shapes mirror tests/stripe/webhook.test.ts so the
 * handler reads exactly the fields it expects.
 */
export interface CompletedSessionMetadata {
  childName?: string;
  world?: string;
  length?: string;
  detailLevel?: string;
  extraMinutes?: string;
  addOns?: string;
  plotNote?: string;
}

export function buildCompletedSessionEvent(args: {
  email: string;
  sessionId: string;
  paymentIntentId: string;
  amountTotalCents?: number;
  metadata: CompletedSessionMetadata;
}): Stripe.Event {
  return {
    id: `evt_${args.sessionId}`,
    type: "checkout.session.completed",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: args.sessionId,
        object: "checkout.session",
        payment_intent: args.paymentIntentId,
        customer_email: args.email,
        customer_details: null,
        amount_total: args.amountTotalCents ?? null,
        metadata: args.metadata,
      },
    },
  } as unknown as Stripe.Event;
}

export function buildRefundEvent(paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_refund_${paymentIntentId}`,
    type: "charge.refunded",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: { object: "charge", payment_intent: paymentIntentId } },
  } as unknown as Stripe.Event;
}

export function buildDisputeEvent(paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_dispute_${paymentIntentId}`,
    type: "charge.dispute.created",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: { object: "dispute", payment_intent: paymentIntentId } },
  } as unknown as Stripe.Event;
}
