/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for a personalized animated video order.
 * Returns { url } — the client should redirect the buyer to that URL.
 *
 * All param shaping is delegated to the pure builder in lib/checkout.ts so
 * this handler stays thin and testable at the unit level.
 *
 * The webhook (separate task) will receive session.completed, read the
 * session's metadata, and create the Customer + Order records.
 */
import { NextRequest, NextResponse } from "next/server";

import { buildCheckoutSessionParams, type CheckoutInput } from "@/lib/checkout";
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  let body: Partial<CheckoutInput>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { childName, world, length, detailLevel, email } = body;

  if (!childName || !world || !length || !detailLevel) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: childName, world, length, and detailLevel are all required.",
      },
      { status: 400 },
    );
  }

  const input: CheckoutInput = { childName, world, length, detailLevel, email };
  const params = buildCheckoutSessionParams(input);

  const session = await stripe.checkout.sessions.create(params);

  return NextResponse.json({ url: session.url }, { status: 200 });
}
