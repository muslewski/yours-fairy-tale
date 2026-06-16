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
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";
import { createOrderTrackingLink } from "@/lib/order-tracking-link";
import { attachCheckoutAssets } from "@/lib/order-action-cores";
import { promisedByForLength, formatPromisedDate } from "@/lib/delivery";
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
 * For charge.refunded / charge.dispute.created with no matching order, the
 * handler THROWS (→ POST 500 → Stripe retries): the event may have arrived
 * before checkout.session.completed created the order, since Stripe does not
 * guarantee event ordering. (Events missing a payment_intent can never match
 * later, so those are warn-and-return.)
 *
 * ACCEPTED FAILURE MODE: an event that will NEVER match (e.g. a refund for an
 * unrelated/pre-launch charge in this Stripe account) retries for Stripe's
 * full backoff window (~3 days), logging "no order yet" each attempt, then
 * surfaces as a failed webhook in the Stripe dashboard. That noise is benign
 * and self-resolving — do not page on it; investigate only if the
 * payment_intent should have a real order.
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
      // Out-of-order delivery: Stripe does not guarantee event ordering, so this
      // refund may arrive before checkout.session.completed has created the
      // order. THROW (→ 500 → Stripe retries with backoff) instead of returning
      // 200, which would permanently drop the refund and leave the order "paid".
      throw new Error(
        `charge.refunded: no order yet for payment_intent ${paymentIntentId} — failing so Stripe retries`,
      );
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
      // Same out-of-order rationale as charge.refunded above.
      throw new Error(
        `charge.dispute.created: no order yet for payment_intent ${paymentIntentId} — failing so Stripe retries`,
      );
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
  // customer_email (pre-filled from checkout params). Lowercase it: emails are
  // case-insensitive, the users collection stores them lowercase, and Better Auth
  // looks up with email.toLowerCase() — so the upsert query and the stored row
  // must be lowercase too or sign-in later fails (new_user_signup_disabled).
  const rawEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const email = rawEmail ? rawEmail.trim().toLowerCase() : null;

  const meta = session.metadata ?? {};
  const { childName, world, length, detailLevel, extraMinutes, addOns, plotNote, assetPaths } = meta;

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

  // What Stripe actually charged (cents). Stored verbatim — the studio
  // dashboard's revenue numbers come from here, never from pricing math.
  const amountTotalCents =
    typeof session.amount_total === "number" ? session.amount_total : undefined;

  // The delivery promise: purchase time + the film length's production window.
  // No length recorded → no automatic promise (studio can set one by hand).
  const promisedBy = promisedByForLength(length, new Date());

  // ------------------------------------------------------------------
  // Create the Order
  // ------------------------------------------------------------------
  const order = await payload.create({
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
      extraMinutes: extraMinutes ? parseInt(extraMinutes, 10) || 0 : undefined,
      addOns: addOns ? addOns.split(",").filter(Boolean) : undefined,
      plotNote: plotNote || undefined,
      amountTotalCents,
      promisedBy: promisedBy ? promisedBy.toISOString() : undefined,
      // status defaults to "paid"; promoted to in_production below when photos attach
    },
    overrideAccess: true,
  });

  // Photos collected before checkout (Phase 3): attach them metadata-only and,
  // when any land, skip the awaiting_assets limbo straight to in_production.
  const pathnames = assetPaths ? assetPaths.split(",").filter(Boolean) : [];
  if (pathnames.length > 0) {
    const attached = await attachCheckoutAssets(String(order.id), pathnames);
    if (attached > 0) {
      await payload.update({
        collection: "orders",
        id: order.id,
        data: { status: "in_production" },
        overrideAccess: true,
      });
    }
  }

  // ------------------------------------------------------------------
  // One-click "track your order" magic link for the confirmation email.
  // Non-fatal: if it can't be minted, fall back to the plain sign-in page.
  // ------------------------------------------------------------------
  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://www.yoursfairytale.com";
  let trackUrl = `${baseUrl.replace(/\/$/, "")}/sign-in`;
  try {
    trackUrl = await createOrderTrackingLink({ email, baseUrl });
  } catch (err) {
    console.error("[webhook] tracking link mint failed (using /sign-in fallback):", err);
  }

  // ------------------------------------------------------------------
  // Send the order confirmation email (non-fatal — log errors, never throw)
  // ------------------------------------------------------------------
  try {
    const childFirstName = childName ? ` for ${childName}` : "";
    await sendEmail({
      to: email,
      subject: `Your video${childFirstName} is on its way`,
      html: buildOrderConfirmationEmail({
        email,
        childName: childName ?? null,
        trackUrl,
        promisedBy,
      }),
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
  trackUrl,
  promisedBy,
}: {
  email: string;
  childName: string | null;
  trackUrl: string;
  promisedBy: Date | null;
}): string {
  const firstLine = childName
    ? `We have received your order and ${childName}'s video is now in production.`
    : "We have received your order and the video is now in production.";

  const paragraphs = [
    firstLine,
    "We will email you the moment your preview is ready to watch.",
  ];
  if (promisedBy) {
    paragraphs.push(
      `We expect it to be ready by ${formatPromisedDate(promisedBy)}.`,
    );
  }
  paragraphs.push(
    `Use the button below to track your video's progress any time. It signs you in with this email address (${email}).`,
  );

  return renderBrandedEmail({
    preheader: "Your order is confirmed.",
    heading: "Your order is confirmed",
    accent: "yellow",
    bodyHtml: emailParagraphs(paragraphs),
    cta: { label: "Track your order", href: trackUrl },
  });
}
