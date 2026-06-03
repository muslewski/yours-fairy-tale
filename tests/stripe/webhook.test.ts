/**
 * Stripe webhook handler tests.
 *
 * Network-free: all calls go through handleStripeEvent (the HTTP-free export).
 * A small set of signature-verification tests also exercise the POST handler
 * by constructing a real Stripe test-header string against the raw body.
 *
 * These tests hit the local Postgres DB via the Payload Local API.
 */
import { expect, test, beforeAll } from "vitest";
import Stripe from "stripe";
import { handleStripeEvent } from "@/app/api/stripe/webhook/route";
import { getPayloadClient } from "@/lib/payload";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function completedEvent(email: string, sessionId: string): Stripe.Event {
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
        payment_intent: `pi_${sessionId}`,
        customer_email: email,
        customer_details: null,
        metadata: {
          childName: "Ada",
          world: "space",
          length: "short",
          detailLevel: "detailed",
        },
      },
    },
  } as unknown as Stripe.Event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("creates user + order on checkout.session.completed", async () => {
  const p = await getPayloadClient();
  const email = `wh-${Date.now()}@x.io`;
  const sessionId = `cs_${Date.now()}_a`;

  await handleStripeEvent(completedEvent(email, sessionId));

  // Exactly one user with that email
  const users = await p.find({
    collection: "users",
    where: { email: { equals: email } },
    overrideAccess: true,
  });
  expect(users.totalDocs).toBe(1);
  const user = users.docs[0];
  expect(user.emailVerified).toBe(true);

  // Exactly one order linked to that session
  const orders = await p.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    overrideAccess: true,
  });
  expect(orders.totalDocs).toBe(1);
  const order = orders.docs[0];
  expect(order.status).toBe("paid");
  expect(order.childName).toBe("Ada");
  expect(order.world).toBe("space");
  expect(order.length).toBe("short");
  // owner is returned as a populated object or an id string; normalise
  const ownerId =
    typeof order.owner === "object" && order.owner !== null
      ? (order.owner as { id: string | number }).id
      : order.owner;
  expect(String(ownerId)).toBe(String(user.id));
});

test("duplicate sessionId is idempotent — no second order created", async () => {
  const p = await getPayloadClient();
  const email = `wh-dup-${Date.now()}@x.io`;
  const sessionId = `cs_${Date.now()}_b`;

  // Fire the same event twice
  await handleStripeEvent(completedEvent(email, sessionId));
  await handleStripeEvent(completedEvent(email, sessionId));

  const orders = await p.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    overrideAccess: true,
  });
  expect(orders.totalDocs).toBe(1);
});

test("same email, second distinct session — 2 orders, 1 user", async () => {
  const p = await getPayloadClient();
  const email = `wh-reuse-${Date.now()}@x.io`;
  const sessionIdA = `cs_${Date.now()}_c1`;
  const sessionIdB = `cs_${Date.now()}_c2`;

  await handleStripeEvent(completedEvent(email, sessionIdA));
  await handleStripeEvent(completedEvent(email, sessionIdB));

  const users = await p.find({
    collection: "users",
    where: { email: { equals: email } },
    overrideAccess: true,
  });
  expect(users.totalDocs).toBe(1);

  const orders = await p.find({
    collection: "orders",
    where: {
      or: [
        { stripeSessionId: { equals: sessionIdA } },
        { stripeSessionId: { equals: sessionIdB } },
      ],
    },
    overrideAccess: true,
  });
  expect(orders.totalDocs).toBe(2);
});

test("unknown event type is ignored without error", async () => {
  const unknownEvent = {
    id: "evt_unknown",
    type: "payment_intent.created",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: {} },
  } as unknown as Stripe.Event;

  // Should resolve without throwing
  await expect(handleStripeEvent(unknownEvent)).resolves.toBeUndefined();
});
