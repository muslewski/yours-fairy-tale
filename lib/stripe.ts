/**
 * Stripe SDK singleton.
 *
 * Import `stripe` from here instead of constructing a new Stripe() instance
 * per file — one instance, one connection pool.
 *
 * Throws at module load time when the secret key is missing so the error
 * surfaces immediately (same pattern as auth.ts / payload.ts in this repo).
 */
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY — set it in .env before starting the server.",
  );
}

export const stripe = new Stripe(key, {
  // Pin to the latest stable version shipped with stripe@22.2.0.
  // Bump this together with the SDK when upgrading.
  apiVersion: "2026-05-27.dahlia",
});
