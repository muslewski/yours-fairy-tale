/**
 * Pure helper — builds a Stripe.Checkout.SessionCreateParams object.
 *
 * No network calls; safe to unit-test without mocking.
 * The actual stripe.checkout.sessions.create() call lives in the route handler.
 */
import type Stripe from "stripe";

export type CheckoutInput = {
  childName: string;
  /** One of the configured story worlds */
  world: "bedtime" | "space" | "sea" | "forest" | "dragons" | "birthday" | "custom";
  length: string;
  detailLevel: string;
  /** Buyer e-mail — pre-fills the Stripe Checkout form when provided */
  email?: string;
};

export function buildCheckoutSessionParams(
  input: CheckoutInput,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
): Stripe.Checkout.SessionCreateParams {
  const { childName, world, length, detailLevel, email } = input;

  // TODO: confirm real pricing with the product owner before going live.
  //       $49 is a placeholder; adjust STRIPE_VIDEO_PRICE_CENTS in .env accordingly.
  const unitAmount =
    Number(process.env.STRIPE_VIDEO_PRICE_CENTS) || 4900;

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    currency: "usd",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: {
            name: "Personalized animated fairy-tale video",
          },
        },
      },
    ],
    // {CHECKOUT_SESSION_ID} is a Stripe template literal — it is NOT a JS template
    // expression, so it must stay as a plain string (no backtick interpolation here).
    success_url: `${baseUrl}/app?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/#build`,
    // Metadata carries the full config so the webhook can reconstruct the order
    // without any intermediary storage.
    metadata: {
      childName,
      world,
      length,
      detailLevel,
    },
  };

  if (email) {
    params.customer_email = email;
  }

  return params;
}
