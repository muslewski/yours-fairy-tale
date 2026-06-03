/**
 * Better Auth client — for use in customer-facing React components.
 *
 * Mirrors the server plugins in `./auth.ts`: the `magicLinkClient()` plugin
 * exposes `authClient.signIn.magicLink()` and `authClient.magicLink.verify()`.
 *
 * NO `baseURL` ON PURPOSE: omitting it makes Better Auth call the CURRENT origin
 * (`window.location.origin`) for `/api/auth/*`. Auth is served from this same
 * Next.js app, so the request is always same-origin — no CORS, no preflight, and
 * it works on localhost, every Vercel preview URL, and a future custom domain
 * with zero env wrangling. Passing a baked-in `NEXT_PUBLIC_APP_URL` here is what
 * breaks login when that env holds a placeholder or stale host (documented in
 * delieta reference implementation).
 */
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [magicLinkClient()],
});
