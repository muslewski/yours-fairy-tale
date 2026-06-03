/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events, verifies the signature, and delegates to
 * handleStripeEvent. Raw-body reading is required for signature verification —
 * Next.js (and any body-parser middleware) must NOT consume the stream first.
 *
 * SECURITY NOTES (from stripe-best-practices skill):
 * - We call `req.text()` (raw bytes as utf-8 string) — never `req.json()` which
 *   would re-serialize and break the HMAC.
 * - STRIPE_WEBHOOK_SECRET is read lazily inside the handler so that importing
 *   this module at dev-time with an empty env doesn't throw at module level.
 * - Bad signature → 400; missing secret → 500; other errors → 400.
 */

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { stripe } from "@/lib/stripe";
import { getPayloadClient } from "@/lib/payload";
import { sendEmail } from "@/lib/email";
import type { WorldId } from "@/lib/worlds";

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Lazy secret read — do NOT hoist to module scope (see header note).
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("[webhook] handleStripeEvent threw:", err);
    return NextResponse.json(
      { error: "Internal webhook processing error." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Pure event handler — exported so tests can call it directly without HTTP
// ---------------------------------------------------------------------------

/**
 * Processes a verified Stripe.Event.
 *
 * Currently handles:
 *   - checkout.session.completed  → upsert user, create order (idempotent), send confirmation email
 *   - charge.refunded             → set order status to "refunded"
 *   - charge.dispute.created      → set order status to "cancelled"
 *
 * Unknown event types are silently ignored (return undefined).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  // ------------------------------------------------------------------
  // charge.refunded — set matching order status to "refunded"
  // ------------------------------------------------------------------
  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : (charge.payment_intent?.id ?? null);

    if (!paymentIntentId) {
      console.warn("[webhook] charge.refunded has no payment_intent — skipping.");
      return;
    }

    const payload = await getPayloadClient();
    const existing = await payload.find({
      collection: "orders",
      where: { stripePaymentIntentId: { equals: paymentIntentId } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.totalDocs === 0) {
      console.warn(
        `[webhook] charge.refunded: no order found for payment_intent ${paymentIntentId}`,
      );
      return;
    }

    const order = existing.docs[0];
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { status: "refunded" },
      overrideAccess: true,
    });
    return;
  }

  // ------------------------------------------------------------------
  // charge.dispute.created — set matching order status to "cancelled"
  // ------------------------------------------------------------------
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object as Stripe.Dispute;
    const paymentIntentId =
      typeof dispute.payment_intent === "string"
        ? dispute.payment_intent
        : (dispute.payment_intent?.id ?? null);

    if (!paymentIntentId) {
      console.warn("[webhook] charge.dispute.created has no payment_intent — skipping.");
      return;
    }

    const payload = await getPayloadClient();
    const existing = await payload.find({
      collection: "orders",
      where: { stripePaymentIntentId: { equals: paymentIntentId } },
      limit: 1,
      overrideAccess: true,
    });

    if (existing.totalDocs === 0) {
      console.warn(
        `[webhook] charge.dispute.created: no order found for payment_intent ${paymentIntentId}`,
      );
      return;
    }

    const order = existing.docs[0];
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { status: "cancelled" },
      overrideAccess: true,
    });
    return;
  }

  if (event.type !== "checkout.session.completed") {
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  const sessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  // Prefer customer_details.email (populated after checkout), fall back to
  // customer_email (pre-filled from checkout params).
  const email =
    session.customer_details?.email ?? session.customer_email ?? null;

  const meta = session.metadata ?? {};
  const { childName, world, length, detailLevel } = meta;

  if (!email) {
    // No email on the event — we cannot create the account. THROW (not return)
    // so the POST handler returns 500 and Stripe RETRIES. A silent 200 would
    // drop the sale with no recovery path, since accounts come ONLY from this
    // webhook. (Code-review I1.)
    throw new Error(
      `checkout.session.completed has no resolvable email — session: ${sessionId}`,
    );
  }

  const payload = await getPayloadClient();

  // ------------------------------------------------------------------
  // Idempotency guard: skip if an order with this sessionId already exists
  // ------------------------------------------------------------------
  const existing = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs > 0) {
    // Already processed — safe to acknowledge without duplicate work.
    return;
  }

  // ------------------------------------------------------------------
  // Upsert user by email
  // ------------------------------------------------------------------
  const existingUsers = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });

  let userId: number | string;

  if (existingUsers.totalDocs > 0) {
    // Reuse the existing user — do NOT create a duplicate.
    userId = existingUsers.docs[0].id;
  } else {
    // Create a new user. emailVerified: true because payment proves email ownership.
    const newUser = await payload.create({
      collection: "users",
      data: {
        email,
        emailVerified: true,
      },
      overrideAccess: true,
    });
    userId = newUser.id;
  }

  // ------------------------------------------------------------------
  // Create the Order
  // ------------------------------------------------------------------
  await payload.create({
    collection: "orders",
    data: {
      owner: userId,
      stripeSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId ?? undefined,
      childName: childName ?? undefined,
      world: (world as WorldId | undefined) ?? undefined,
      length: (length as "short" | "medium" | "long" | undefined) ?? undefined,
      detailLevel:
        (detailLevel as "basic" | "detailed" | "premium" | undefined) ??
        undefined,
      // status defaults to "paid" via the collection schema
    },
    overrideAccess: true,
  });

  // ------------------------------------------------------------------
  // Send the order confirmation email (non-fatal — log errors, never throw)
  // ------------------------------------------------------------------
  try {
    const childFirstName = childName ? ` for ${childName}` : "";
    await sendEmail({
      to: email,
      subject: `Your video${childFirstName} is on its way`,
      html: buildOrderConfirmationEmail({ email, childName: childName ?? null }),
    });
  } catch (err) {
    console.error("[webhook] Confirmation email failed (order still created):", err);
  }
}

// ---------------------------------------------------------------------------
// Email copy — brand-voice: calm, warm, parent-facing, American English
// ---------------------------------------------------------------------------

function buildOrderConfirmationEmail({
  email,
  childName,
}: {
  email: string;
  childName: string | null;
}): string {
  const childLine = childName
    ? `<p>We have received your order and ${childName}'s video is now in production.</p>`
    : `<p>We have received your order and the video is now in production.</p>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Your order is confirmed</title>
</head>
<body style="font-family: sans-serif; color: #1a1033; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <h1 style="font-size: 22px; margin-bottom: 8px;">Your order is confirmed.</h1>
  ${childLine}
  <p>Our team will hand-animate every scene with care. We will reach out when it is ready for you to watch.</p>
  <p>
    In the meantime, sign in at
    <a href="https://yoursfairytale.com/sign-in" style="color: #17c7e2;">yoursfairytale.com/sign-in</a>
    using this email address (${email}) to follow along with production and access your video when it is delivered.
  </p>
  <p>Thank you for trusting us with their story.</p>
  <p style="margin-top: 32px; font-size: 13px; color: #888;">
    Yours Fairy Tale &mdash; a keepsake they will ask for again and again.
  </p>
</body>
</html>
  `.trim();
}
