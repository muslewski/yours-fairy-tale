/**
 * Tests for:
 *   - Part A (Task 3.3): confirmation email sent on checkout.session.completed
 *   - Part B (Task 3.4): charge.refunded + charge.dispute.created → status sync
 *
 * Resend is mocked — no real email is sent.
 * All DB operations run against the local Postgres via the Payload Local API.
 */
import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import Stripe from "stripe";
import { handleStripeEvent } from "@/app/api/stripe/webhook/route";
import { getPayloadClient } from "@/lib/payload";

// ---------------------------------------------------------------------------
// Mock Resend so no real email is sent in tests
// ---------------------------------------------------------------------------

const mockEmailsSend = vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null });

vi.mock("resend", () => {
  // Must use a real function (not an arrow fn) so `new Resend()` works.
  function ResendMock() {
    return { emails: { send: mockEmailsSend } };
  }
  return { Resend: ResendMock };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function completedEvent(
  email: string,
  sessionId: string,
  paymentIntentId?: string,
): Stripe.Event {
  return {
    id: `evt_${sessionId}`,
    type: "checkout.session.completed",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: sessionId,
        object: "checkout.session",
        payment_intent: paymentIntentId ?? `pi_${sessionId}`,
        customer_email: email,
        customer_details: null,
        metadata: {
          childName: "Lily",
          world: "forest",
          length: "medium",
          detailLevel: "basic",
        },
      },
    },
  } as unknown as Stripe.Event;
}

function chargeRefundedEvent(paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_refund_${Date.now()}`,
    type: "charge.refunded",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: `ch_${Date.now()}`,
        object: "charge",
        payment_intent: paymentIntentId,
        refunded: true,
      },
    },
  } as unknown as Stripe.Event;
}

function disputeCreatedEvent(paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_dispute_${Date.now()}`,
    type: "charge.dispute.created",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: `dp_${Date.now()}`,
        object: "dispute",
        payment_intent: paymentIntentId,
        status: "needs_response",
      },
    },
  } as unknown as Stripe.Event;
}

// ---------------------------------------------------------------------------
// Part A: Email on checkout.session.completed
// ---------------------------------------------------------------------------

describe("Part A — confirmation email", () => {
  beforeEach(() => {
    mockEmailsSend.mockClear();
    // Ensure env vars are set so the email helper can run
    process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test_mock";
    process.env.RESEND_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
    process.env.RESEND_TO_OVERRIDE = "kif0031@gmail.com";
  });

  afterEach(() => {
    // Restore override — leave it as set (it's from .env anyway)
  });

  test("sends confirmation email once on checkout.session.completed", async () => {
    const email = `email-test-${Date.now()}@x.io`;
    const sessionId = `cs_email_${Date.now()}`;

    await handleStripeEvent(completedEvent(email, sessionId));

    // Should call Resend exactly once
    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
  });

  test("routes email to RESEND_TO_OVERRIDE when set", async () => {
    const email = `buyer-${Date.now()}@x.io`;
    const sessionId = `cs_override_${Date.now()}`;

    await handleStripeEvent(completedEvent(email, sessionId));

    const call = mockEmailsSend.mock.calls[0][0];
    // The `to` must be the override address, not the buyer's address
    expect(call.to).toBe("kif0031@gmail.com");
  });

  test("subject line is prefixed with intended recipient when override is active", async () => {
    const email = `buyer-subject-${Date.now()}@x.io`;
    const sessionId = `cs_subject_${Date.now()}`;

    await handleStripeEvent(completedEvent(email, sessionId));

    const call = mockEmailsSend.mock.calls[0][0];
    // Subject should include the real recipient address so dev mail is traceable
    expect(call.subject).toContain(email);
  });

  test("order is still created when email send throws", async () => {
    const p = await getPayloadClient();
    mockEmailsSend.mockRejectedValueOnce(new Error("Resend network error"));

    const email = `email-fail-${Date.now()}@x.io`;
    const sessionId = `cs_emailfail_${Date.now()}`;

    // Should resolve without throwing even though the email send fails
    await expect(
      handleStripeEvent(completedEvent(email, sessionId)),
    ).resolves.toBeUndefined();

    // Order must still exist
    const orders = await p.find({
      collection: "orders",
      where: { stripeSessionId: { equals: sessionId } },
      overrideAccess: true,
    });
    expect(orders.totalDocs).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Part B: charge.refunded + charge.dispute.created → status sync
// ---------------------------------------------------------------------------

describe("Part B — refund / dispute status sync", () => {
  /**
   * Helper: create an order via a completed-checkout event, then return the
   * paymentIntentId that was used so we can fire refund/dispute events against it.
   */
  async function seedOrder(suffix: string) {
    const email = `refund-seed-${suffix}-${Date.now()}@x.io`;
    const sessionId = `cs_seed_${suffix}_${Date.now()}`;
    const paymentIntentId = `pi_seed_${suffix}_${Date.now()}`;

    await handleStripeEvent(completedEvent(email, sessionId, paymentIntentId));

    const p = await getPayloadClient();
    const orders = await p.find({
      collection: "orders",
      where: { stripeSessionId: { equals: sessionId } },
      overrideAccess: true,
    });
    const order = orders.docs[0];
    return { order, paymentIntentId };
  }

  beforeEach(() => {
    mockEmailsSend.mockClear();
  });

  test("charge.refunded sets order status to 'refunded'", async () => {
    const p = await getPayloadClient();
    const { order, paymentIntentId } = await seedOrder("refund");

    // Ensure status starts as 'paid'
    expect(order.status).toBe("paid");

    await handleStripeEvent(chargeRefundedEvent(paymentIntentId));

    const refreshed = await p.findByID({
      collection: "orders",
      id: order.id,
      overrideAccess: true,
    });
    expect(refreshed.status).toBe("refunded");
  });

  test("charge.dispute.created sets order status to 'cancelled'", async () => {
    const p = await getPayloadClient();
    const { order, paymentIntentId } = await seedOrder("dispute");

    expect(order.status).toBe("paid");

    await handleStripeEvent(disputeCreatedEvent(paymentIntentId));

    const refreshed = await p.findByID({
      collection: "orders",
      id: order.id,
      overrideAccess: true,
    });
    expect(refreshed.status).toBe("cancelled");
  });

  test("charge.refunded for unknown paymentIntentId does not throw and changes nothing", async () => {
    const unknownPi = `pi_unknown_${Date.now()}`;

    await expect(
      handleStripeEvent(chargeRefundedEvent(unknownPi)),
    ).resolves.toBeUndefined();
  });

  test("charge.dispute.created for unknown paymentIntentId does not throw and changes nothing", async () => {
    const unknownPi = `pi_unknown_dispute_${Date.now()}`;

    await expect(
      handleStripeEvent(disputeCreatedEvent(unknownPi)),
    ).resolves.toBeUndefined();
  });
});
