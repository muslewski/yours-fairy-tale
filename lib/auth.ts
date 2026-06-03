/**
 * Better Auth server instance — the CUSTOMER auth surface.
 *
 * PERSISTENCE: All BA DB operations route through a custom BA→Payload Local API
 * adapter (`./better-auth-payload-adapter.ts`). Payload owns the schema; the
 * `users/accounts/sessions/verifications` collections mirror BA's camelCase
 * field names 1:1. BA never touches Postgres directly.
 *
 * AUTH MODEL: magic-link sign-in only — no emailAndPassword, no social providers.
 * Accounts are NEVER created via the client sign-up path; they are created
 * server-side by the Stripe checkout webhook (a future task). Therefore
 * `disableSignUp: true` on the magicLink plugin: requesting a link for an
 * unknown email returns an error rather than auto-creating a user.
 *
 * Coexistence with Payload (verified pattern from delieta reference):
 *  - Payload admin UI:   /admin          (Payload's OWN auth, `admins` collection)
 *  - Payload REST/GQL:   /api/[...slug], /api/graphql, /api/graphql-playground
 *  - Better Auth:        /api/auth/*     (this instance; outside (payload) route group)
 *  - Cookies do NOT collide: Payload sets `payload-token`; BA sets
 *    `better-auth.session_token`. Distinct namespaces.
 *
 * NOTE: sendMagicLink currently console.logs the link for development. Real
 * email transport via Resend is a later task.
 */
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";

import { payloadBetterAuthAdapter } from "./better-auth-payload-adapter";

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret) {
  throw new Error(
    "BETTER_AUTH_SECRET environment variable is not set. " +
      "Generate one with: openssl rand -base64 32",
  );
}

// Origins Better Auth will accept requests from. We explicitly list our known
// production domains and cover preview/dev without relying on a dynamic env var
// that might be stale or missing.
const trustedOrigins = [
  "http://localhost:3000",
  "http://localhost:3002",
  "https://yoursfairytale.com",
  "https://www.yoursfairytale.com",
  "https://*.vercel.app",
];

export const auth = betterAuth({
  secret,
  trustedOrigins,
  database: payloadBetterAuthAdapter,
  // emailAndPassword intentionally absent — magic-link only.
  plugins: [
    magicLink({
      /**
       * Sign-up is DISABLED: only webhook-created users (Stripe checkout) can
       * receive a magic link. Requesting a link for an email that has no existing
       * user record returns an error instead of silently creating an account.
       *
       * Option confirmed against better-auth@1.6.14 magic-link plugin types:
       * `disableSignUp?: boolean` on MagicLinkOptions (index.d.mts line 46).
       */
      disableSignUp: true,
      sendMagicLink: async ({ email, url }) => {
        // DEV: log the magic link to the console.
        // FUTURE: replace with Resend email transport (later task).
        console.log(`[auth] Magic link for ${email}: ${url}`);
      },
    }),
  ],
});
