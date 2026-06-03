/**
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout Session for a personalized animated video order.
 * Returns { url } — the client should redirect the buyer to that URL.
 *
 * SECURITY: the request body carries SELECTIONS, never a price. The charge
 * amount is recomputed server-side via the shared pricing model (inside
 * buildCheckoutSessionParams → computeTotalCents). A client can never dictate
 * what they pay. Invalid selections → 400.
 *
 * The webhook receives checkout.session.completed, reads the session metadata,
 * and creates the Customer + Order records.
 */
import { NextRequest, NextResponse } from "next/server";

import { buildCheckoutSessionParams, type CheckoutInput } from "@/lib/checkout";
import { stripe } from "@/lib/stripe";
import { isWorldId } from "@/lib/worlds";

export async function POST(req: NextRequest) {
  let body: Partial<CheckoutInput>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { childName, world, length, detail, extraMinutes, addOns, email } = body;

  // world / length / detail are required to shape and price the order.
  // childName is intentionally optional — the parent can add it later.
  if (!world || !length || !detail) {
    return NextResponse.json(
      { error: "Missing required fields: world, length, and detail are required." },
      { status: 400 },
    );
  }

  if (!isWorldId(world)) {
    return NextResponse.json({ error: "Unknown story world." }, { status: 400 });
  }

  const input: CheckoutInput = {
    childName: typeof childName === "string" ? childName : "",
    world,
    length,
    detail,
    extraMinutes: typeof extraMinutes === "number" ? extraMinutes : 0,
    addOns: Array.isArray(addOns) ? addOns : [],
    email,
  };

  let params;
  try {
    // Recomputes (and validates) the price from the selections — throws on
    // anything invalid (unknown length/detail/add-on, out-of-range minutes).
    params = buildCheckoutSessionParams(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid selections.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create(params);

  return NextResponse.json({ url: session.url }, { status: 200 });
}
