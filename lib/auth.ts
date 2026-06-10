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
 * NOTE: sendMagicLink sends the branded link via Resend (see lib/email.ts and
 * lib/auth-emails.ts). It also console.logs the link for development and, under
 * Playwright, persists it to a file for the e2e auth fixture.
 */
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";

import { buildMagicLinkEmail } from "@/lib/auth-emails";
import { toConfirmSignInUrl } from "@/lib/auth-confirm-url";
import { sendEmail } from "@/lib/email";

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
  "http://localhost:1234",
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
        // Send a link to our confirmation interstitial (/sign-in/verify), NOT the
        // raw verify endpoint. The raw endpoint consumes the single-use token on
        // the first GET, so email scanners / link-preview bots that fetch the link
        // would burn it before the human clicks (→ INVALID_TOKEN). The interstitial
        // consumes nothing on GET; a human form submit finishes sign-in.
        const link = toConfirmSignInUrl(url);

        // DEV: log the link to the console (always, alongside the email).
        console.log(`[auth] Magic link for ${email}: ${link}`);

        // TEST-ONLY SINK: under Playwright, also persist the link to a file so the
        // auth fixture can read it back. Gated strictly on PLAYWRIGHT_TEST === "1"
        // so production/dev behavior is unchanged.
        if (process.env.PLAYWRIGHT_TEST === "1") {
          const { mkdirSync, writeFileSync } = await import("node:fs");
          mkdirSync("e2e/.auth", { recursive: true });
          writeFileSync("e2e/.auth/last-magic-link.txt", link, "utf8");
        }

        try {
          await sendEmail({
            to: email,
            subject: "Your Yours Fairy Tale sign-in link",
            html: buildMagicLinkEmail(link),
          });
        } catch (err) {
          console.error("[auth] magic-link email failed:", err);
          // Rethrow so Better Auth surfaces an error to the client; the sign-in
          // page then shows its gentle error state instead of a false
          // "check your email" success.
          throw err;
        }
      },
    }),
  ],
});
