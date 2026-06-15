import { handleStripeEvent } from "@/app/api/stripe/webhook/route";
import { buildCheckoutSessionParams, type CheckoutInput } from "@/lib/checkout";
import { getOrdersForOwner } from "@/lib/customer-data";
import { createOrderTrackingLink } from "@/lib/order-tracking-link";
import type { OrderStatus } from "@/lib/order-stages";
import { getPayloadClient } from "@/lib/payload";
import { computeTotalCents } from "@/lib/pricing";
import { seedCustomer, seedOrder } from "@/e2e/fixtures/seed";
import { buildCompletedSessionEvent } from "../lib/synthetic-stripe";

export interface CreateOrderArgs {
  email: string;
  childName?: string;
  world?: string;
  length?: string;
  detailLevel?: string;
  extraMinutes?: number;
  addOns?: string[];
  plotNote?: string;
  /** Optional status applied after creation (e.g. to stage a downstream UI state). */
  status?: OrderStatus;
  /** "webhook" (default) drives handleStripeEvent; "seed" inserts directly. */
  mode?: "webhook" | "seed";
}

export interface CreateOrderResult {
  orderId: string;
  owner: string;
  status: string;
  sessionId: string;
  paymentIntentId: string;
  trackingLink: string;
}

function normalizeOwner(owner: unknown): string {
  return typeof owner === "object" && owner !== null
    ? String((owner as { id: string }).id)
    : String(owner);
}

async function mintTrackingLink(email: string): Promise<string> {
  try {
    return await createOrderTrackingLink({
      email,
      baseUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3100",
      callbackURL: "/app",
    });
  } catch (err) {
    console.error("create_order: failed to mint trackingLink (non-fatal)", err);
    return "";
  }
}

export async function createOrder(args: CreateOrderArgs): Promise<CreateOrderResult> {
  const email = args.email.trim().toLowerCase();
  const stamp = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
  const sessionId = `cs_agent_${stamp}`;
  const paymentIntentId = `pi_agent_${stamp}`;
  const payload = await getPayloadClient();

  if (args.mode === "seed") {
    const user = await seedCustomer(email);
    const order = await seedOrder(user.id, args.status ?? "paid", args.childName ?? "Ada");
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { stripePaymentIntentId: paymentIntentId },
      overrideAccess: true,
    });
    const trackingLink = await mintTrackingLink(email);
    return {
      orderId: String(order.id),
      owner: String(user.id),
      status: String(order.status),
      sessionId: String(order.stripeSessionId),
      paymentIntentId,
      trackingLink,
    };
  }

  await handleStripeEvent(
    buildCompletedSessionEvent({
      email,
      sessionId,
      paymentIntentId,
      metadata: {
        childName: args.childName ?? "",
        world: args.world ?? "space",
        length: args.length ?? "short",
        detailLevel: args.detailLevel ?? "detailed",
        extraMinutes: args.extraMinutes != null ? String(args.extraMinutes) : undefined,
        addOns: args.addOns ? args.addOns.join(",") : undefined,
        plotNote: args.plotNote,
      },
    }),
  );

  const found = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });
  const order = found.docs[0];
  if (!order) throw new Error("create_order: order was not created by handleStripeEvent");

  if (args.status && args.status !== order.status) {
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { status: args.status },
      overrideAccess: true,
    });
  }

  const trackingLink = await mintTrackingLink(email);
  return {
    orderId: String(order.id),
    owner: normalizeOwner(order.owner),
    status: String(args.status ?? order.status),
    sessionId,
    paymentIntentId,
    trackingLink,
  };
}

export async function getOrder(orderId: string) {
  const payload = await getPayloadClient();
  return payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  });
}

export async function listOrders(args: { email?: string }) {
  const payload = await getPayloadClient();
  if (args.email) {
    const users = await payload.find({
      collection: "users",
      where: { email: { equals: args.email.trim().toLowerCase() } },
      limit: 1,
      overrideAccess: true,
    });
    if (users.totalDocs === 0) return [];
    return getOrdersForOwner(String(users.docs[0].id));
  }
  const result = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    sort: "-createdAt",
    limit: 50,
  });
  return result.docs;
}

export function getCheckoutIntent(input: CheckoutInput) {
  const params = buildCheckoutSessionParams(input);
  const amountCents = computeTotalCents({
    length: input.length,
    detail: input.detail,
    extraMinutes: input.extraMinutes,
    addOns: input.addOns,
  });
  return {
    amountCents,
    successUrl: params.success_url,
    cancelUrl: params.cancel_url,
    metadata: params.metadata,
  };
}
