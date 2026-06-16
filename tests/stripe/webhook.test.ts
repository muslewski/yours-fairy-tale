/**
 * Stripe webhook handler tests.
 *
 * Network-free: all calls go through handleStripeEvent (the HTTP-free export).
 * A small set of signature-verification tests also exercise the POST handler
 * by constructing a real Stripe test-header string against the raw body.
 *
 * These tests hit the local Postgres DB via the Payload Local API.
 */
import { expect, test, vi } from "vitest";
import Stripe from "stripe";
import { handleStripeEvent, POST } from "@/app/api/stripe/webhook/route";
import { stripe } from "@/lib/stripe";
import { getPayloadClient } from "@/lib/payload";

// The webhook head()s each asset pathname for its content-type/size; mock Blob so
// these DB-backed tests never hit the network. head() only runs when assetPaths exist.
vi.mock("@vercel/blob", () => ({
  head: vi.fn().mockResolvedValue({ contentType: "image/jpeg", size: 12345 }),
}));

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

function completedEventWithExtras(email: string, sessionId: string): Stripe.Event {
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
          extraMinutes: "3",
          addOns: "narration,music",
          plotNote: "A brave knight.",
        },
      },
    },
  } as unknown as Stripe.Event;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("checkout with assetPaths attaches metadata-only media and goes in_production", async () => {
  const p = await getPayloadClient();
  const email = `wh-assets-${Date.now()}@x.io`;
  const sessionId = `cs_${Date.now()}_assets`;
  const evt = completedEvent(email, sessionId);
  // Unique filenames per run: media filenames are unique (in prod they're blob
  // pathnames with addRandomSuffix), and media docs persist across test runs.
  const stamp = Date.now();
  (evt.data.object as { metadata: Record<string, string> }).metadata.assetPaths =
    `configurator/${stamp}-a.jpg,configurator/${stamp}-b.jpg`;

  await handleStripeEvent(evt);

  const orders = await p.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    depth: 0,
    overrideAccess: true,
  });
  const order = orders.docs[0];
  expect(order.status).toBe("in_production");
  expect(typeof order.inStudioSince).toBe("string"); // stamped on first entry to production
  expect((order.assets as unknown[]).length).toBe(2);
});

test("assetPaths outside the configurator/ prefix are NOT attached (IDOR guard)", async () => {
  const p = await getPayloadClient();
  const email = `wh-idor-${Date.now()}@x.io`;
  const sessionId = `cs_${Date.now()}_idor`;
  const evt = completedEvent(email, sessionId);
  // Mocked head() would return an image for ANY path; the prefix guard must
  // reject these before head() so a foreign blob can't be attached.
  (evt.data.object as { metadata: Record<string, string> }).metadata.assetPaths =
    "media/someone-elses-photo.jpg,proof/another-order.mp4";

  await handleStripeEvent(evt);

  const orders = await p.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    depth: 0,
    overrideAccess: true,
  });
  const order = orders.docs[0];
  expect((order.assets ?? []) as unknown[]).toHaveLength(0);
  expect(order.status).toBe("paid"); // nothing attached → no in_production promotion
  expect(order.inStudioSince ?? null).toBeNull(); // never entered production → no stamp
});

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

test("order carries extraMinutes, addOns, and plotNote from session metadata", async () => {
  const p = await getPayloadClient();
  const email = `wh-extras-${Date.now()}@x.io`;
  const sessionId = `cs_${Date.now()}_extras`;

  await handleStripeEvent(completedEventWithExtras(email, sessionId));

  const orders = await p.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    overrideAccess: true,
  });
  expect(orders.totalDocs).toBe(1);
  const order = orders.docs[0];
  expect(order.extraMinutes).toBe(3);
  expect(order.addOns).toEqual(["narration", "music"]);
  expect(order.plotNote).toBe("A brave knight.");
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

test("checkout.session.completed stores the charged amount and a delivery promise", async () => {
  const email = `wh-amount-${Date.now()}@example.com`;
  const sessionId = `cs_amount_${Date.now()}`;
  const event = completedEvent(email, sessionId);
  (event.data.object as unknown as Record<string, unknown>).amount_total = 51000;

  await handleStripeEvent(event);

  const payload = await getPayloadClient();
  const orders = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });
  expect(orders.totalDocs).toBe(1);
  const order = orders.docs[0] as Record<string, unknown>;

  expect(order.amountTotalCents).toBe(51000);

  // completedEvent uses length: "short" → promise lands 7 days out from the
  // moment the webhook ran (60s tolerance for test runtime).
  const promised = new Date(order.promisedBy as string).getTime();
  const expected = Date.now() + 7 * 24 * 60 * 60 * 1000;
  expect(Math.abs(promised - expected)).toBeLessThan(60_000);
});

test("checkout.session.completed without amount_total leaves the amount unrecorded", async () => {
  const email = `wh-noamount-${Date.now()}@example.com`;
  const sessionId = `cs_noamount_${Date.now()}`;
  // completedEvent sets no amount_total — exactly the case under test.
  await handleStripeEvent(completedEvent(email, sessionId));

  const payload = await getPayloadClient();
  const orders = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });
  const order = orders.docs[0] as Record<string, unknown>;
  expect(order.amountTotalCents ?? null).toBeNull();
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

// ---------------------------------------------------------------------------
// I1: a completed event with no resolvable email must THROW, so the POST
// handler returns 500 and Stripe RETRIES (rather than silently dropping the sale).
// ---------------------------------------------------------------------------

test("checkout.session.completed with no email throws (Stripe will retry)", async () => {
  const ev = completedEvent("x@x.io", `cs_${Date.now()}_noemail`);
  (ev.data.object as { customer_email: string | null }).customer_email = null;
  (ev.data.object as { customer_details: unknown }).customer_details = null;
  await expect(handleStripeEvent(ev)).rejects.toThrow(/no resolvable email/);
});

// ---------------------------------------------------------------------------
// Out-of-order delivery: refund/dispute events may arrive BEFORE the order
// exists (Stripe does not guarantee event ordering relative to
// checkout.session.completed). The handler must THROW so the POST returns 500
// and Stripe retries — a silent 200 would drop the status change forever.
// ---------------------------------------------------------------------------

test("charge.refunded with no matching order throws so Stripe retries", async () => {
  const ev = {
    id: "evt_test_orphan_refund",
    type: "charge.refunded",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: "ch_orphan",
        object: "charge",
        payment_intent: "pi_orphan_never_existed",
        refunded: true,
      },
    },
  } as unknown as Stripe.Event;
  await expect(handleStripeEvent(ev)).rejects.toThrow(/no order yet/);
});

test("charge.dispute.created with no matching order throws so Stripe retries", async () => {
  const ev = {
    id: "evt_test_orphan_dispute",
    type: "charge.dispute.created",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: "dp_orphan",
        object: "dispute",
        payment_intent: "pi_orphan_never_existed",
        status: "needs_response",
      },
    },
  } as unknown as Stripe.Event;
  await expect(handleStripeEvent(ev)).rejects.toThrow(/no order yet/);
});

// ---------------------------------------------------------------------------
// HTTP layer — the signature security boundary (rejection paths + happy path)
// ---------------------------------------------------------------------------

const TEST_SECRET = "whsec_test_secret_for_unit_tests";

function restoreSecret(prev: string | undefined) {
  if (prev === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = prev;
}

function postRequest(rawBody: string, headers: Record<string, string>) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: rawBody,
    headers,
  }) as unknown as Parameters<typeof POST>[0];
}

test("POST → 500 when the webhook secret is not configured", async () => {
  const prev = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    const res = await POST(postRequest("{}", { "stripe-signature": "x" }));
    expect(res.status).toBe(500);
  } finally {
    restoreSecret(prev);
  }
});

test("POST → 400 when the stripe-signature header is missing", async () => {
  const prev = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET;
  try {
    const res = await POST(postRequest("{}", {}));
    expect(res.status).toBe(400);
  } finally {
    restoreSecret(prev);
  }
});

test("POST → 400 on an invalid signature", async () => {
  const prev = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET;
  try {
    const res = await POST(
      postRequest(JSON.stringify({ id: "evt" }), {
        "stripe-signature": "t=1,v1=deadbeef",
      }),
    );
    expect(res.status).toBe(400);
  } finally {
    restoreSecret(prev);
  }
});

test("POST → 200 on a correctly-signed event", async () => {
  const prev = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET;
  try {
    const email = `wh-http-${Date.now()}@x.io`;
    const rawBody = JSON.stringify(completedEvent(email, `cs_${Date.now()}_http`));
    const header = stripe.webhooks.generateTestHeaderString({
      payload: rawBody,
      secret: TEST_SECRET,
    });
    const res = await POST(postRequest(rawBody, { "stripe-signature": header }));
    expect(res.status).toBe(200);
  } finally {
    restoreSecret(prev);
  }
});
