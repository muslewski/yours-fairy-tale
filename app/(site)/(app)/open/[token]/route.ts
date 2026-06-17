/**
 * /open/<token> — the durable, reusable order-access link target. PUBLIC (a
 * route handler, so the (app) gate never applies; the visitor is signed OUT).
 *
 * A live token re-mints a short-lived internal Better Auth magic-link
 * verification for the order's owner and hands off to BA's real verify endpoint
 * server-side (auth.api.magicLinkVerify, asResponse) — the returned Response
 * carries the session cookie + a 302 to the order, so the customer is signed in
 * instantly and lands on their order with NO confirm interstitial. The durable
 * token is never consumed → the email link is reusable for 30 days.
 *
 * An unknown/expired token redirects to /open/expired (no order id leaked).
 */
import { auth } from "@/lib/auth";
import { resolveOrderByAccessToken, mintEphemeralSignin } from "@/lib/order-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const expired = new URL("/open/expired", req.url);

  let resolved;
  try {
    resolved = await resolveOrderByAccessToken(token, new Date());
  } catch (err) {
    console.error("[open] resolve failed:", err);
    return Response.redirect(expired, 302);
  }
  if (!resolved) return Response.redirect(expired, 302);

  try {
    const ephemeral = await mintEphemeralSignin(resolved.ownerEmail);
    return await auth.api.magicLinkVerify({
      query: { token: ephemeral, callbackURL: `/app/orders/${resolved.orderId}` },
      headers: req.headers,
      asResponse: true,
    });
  } catch (err) {
    console.error("[open] sign-in handoff failed:", err);
    return Response.redirect(expired, 302);
  }
}
