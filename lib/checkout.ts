/**
 * Pure helper — builds a Stripe.Checkout.SessionCreateParams object.
 *
 * No network calls; safe to unit-test without mocking.
 * The actual stripe.checkout.sessions.create() call lives in the route handler.
 *
 * SECURITY: the charge amount is computed HERE from the buyer's selections via
 * computeTotalCents() — never accepted from the client. A tampered request can
 * only change *what* they configure, never the price they pay.
 */
import type Stripe from "stripe";

import {
  computeTotalCents,
  summarizeSelections,
  type OrderSelections,
} from "@/lib/pricing";
import { MAX_CHECKOUT_PHOTOS } from "@/lib/order-upload-validation";
import type { WorldId } from "@/lib/worlds";

export type CheckoutInput = {
  /** Child's first name. May be empty — the parent can add it later. */
  childName: string;
  /** One of the configured story worlds. */
  world: WorldId;
  /** Selections that drive the price (validated by computeTotalCents). */
  length: string;
  detail: string;
  extraMinutes: number;
  addOns: string[];
  /** Optional free-text plot idea from the parent (capped before sending). */
  plotNote?: string;
  /** Buyer e-mail — pre-fills the Stripe Checkout form when provided. */
  email?: string;
  /** Blob pathnames of photos uploaded in the configurator (≤ MAX_CHECKOUT_PHOTOS). */
  assetPaths?: string[];
};

export function buildCheckoutSessionParams(
  input: CheckoutInput,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
): Stripe.Checkout.SessionCreateParams {
  const { childName, world, length, detail, extraMinutes, addOns, email, plotNote, assetPaths } =
    input;

  const selections: OrderSelections = { length, detail, extraMinutes, addOns };

  // Join the (capped) pathnames into one Stripe metadata value. Stripe caps a
  // value at 500 chars; we trim to ≤ 480 by dropping extras, never splitting a path.
  const assetPathList: string[] = [];
  let assetPathLen = 0;
  for (const p of (assetPaths ?? []).slice(0, MAX_CHECKOUT_PHOTOS)) {
    const add = (assetPathList.length ? 1 : 0) + p.length;
    if (assetPathLen + add > 480) break;
    assetPathList.push(p);
    assetPathLen += add;
  }

  // Authoritative amount — recomputed server-side from the selections. Throws
  // on any invalid selection so the route can return 400.
  const unitAmount = computeTotalCents(selections);
  const description = summarizeSelections(selections);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    // Show the "Add promotion code" field on the hosted Checkout page so buyers
    // can redeem a promotion code (which maps to a Stripe coupon). Safe to set
    // unconditionally: it only renders the field; it cannot be combined with a
    // `discounts` param, and we never pass one.
    allow_promotion_codes: true,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: "Personalized animated fairy-tale video",
            description,
          },
        },
      },
    ],
    // {CHECKOUT_SESSION_ID} is a Stripe template literal — it is NOT a JS template
    // expression, so it must stay as a plain string (no backtick interpolation here).
    success_url: `${baseUrl}/order-confirmed?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/#build`,
    // Metadata carries the order fields the webhook needs to create the order
    // without any intermediary storage.
    metadata: {
      childName,
      world,
      length,
      detailLevel: detail,
      extraMinutes: String(extraMinutes),
      addOns: addOns.join(","),
      plotNote: (plotNote ?? "").slice(0, 500),
      assetPaths: assetPathList.join(","),
    },
  };

  if (email) {
    params.customer_email = email;
  }

  return params;
}
