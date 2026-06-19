---
type: decision
summary: "Production switched from Stripe TEST mode to LIVE mode — real payments. New live webhook endpoint we_1Tk8DHPNnqZRtjXH2wVVXGgw at the www host; prod STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET (Production scope only) set to live values; old live endpoint we_1TeMUo deleted. Test mode now lives only in local dev/.env. Supersedes [[stripe-webhook-test-mode]]."
tags: [stripe, webhook, ops, infra, payments, go-live]
status: active
created: 2026-06-19
updated: 2026-06-19
related: ["[[checkout]]", "[[stripe-webhook-test-mode]]"]
sources: []
decided: 2026-06-19
supersededBy: ""
---

## Context
The site ran prod in Stripe TEST mode (appropriate for a pre-revenue prototype, see
`[[stripe-webhook-test-mode]]`). The owner decided to take real money. Test mode stays
on local dev only; Production goes live.

## Decision
Flip Production to Stripe LIVE mode. Dev/preview keep test keys in local `.env` (the
three Stripe vars in Vercel are **Production-scoped only**, so dev was never touched).

### What changed (2026-06-19)
- **Account** `acct_1TeDVZPNnqZRtjXH` ("YoursFairyTale", individual, country PL) verified
  live-ready: `charges_enabled: true`, `payouts_enabled: true`, `details_submitted: true`,
  `card_payments` capability **active**, bank account attached, zero pending requirements.
- **Webhook endpoint** — the old LIVE endpoint `we_1TeMUo…` already had the correct config
  (www host, the 3 events) but its signing secret is unrecoverable via API (returned only
  at creation). Recreated a fresh live endpoint `we_1Tk8DHPNnqZRtjXH2wVVXGgw` →
  `https://www.yoursfairytale.com/api/stripe/webhook`, events
  `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`,
  `api_version: 2026-05-27.dahlia`; captured its `whsec_` straight into Vercel without
  printing it; then **deleted** the stale `we_1TeMUo…`.
- **Vercel Production env** — `STRIPE_SECRET_KEY` → `sk_live_…`,
  `STRIPE_WEBHOOK_SECRET` → the new endpoint's live signing secret. Redeployed prod
  (`vercel redeploy` of the latest prod deployment), aliased to `www.yoursfairytale.com`.

## Verification
- `POST /api/stripe/checkout` on prod returns a `cs_live_…` Checkout Session
  (`livemode: true`) → the live secret key is active and the route boots clean.
- Boot env validation (`lib/required-env.ts`) passes (both Stripe vars present in prod).
- A full real-charge → signed-webhook-delivery test was **skipped by owner choice**
  (smallest config is $300, live mode rejects test cards, EU refund fees are
  non-refundable). The first real order is the end-to-end proof; the endpoint retries
  failed deliveries for ~3 days, and a missed event can be replayed from the dashboard.

## Operational notes
- Endpoint URL is the **www** apex-canonical host. Never point a Stripe webhook at the
  apex `https://yoursfairytale.com` — it 308-redirects to www and Stripe won't follow.
- Charges are presented in **USD** (`lib/checkout.ts` hardcodes `currency: "usd"`) while
  the account settles to **PLN** — Stripe converts at payout. If USD presentment is
  undesired, change the currency in `buildCheckoutSessionParams`.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` sits in Production env but is **unused** — the flow
  is Stripe-HOSTED Checkout (server creates the session, client redirects to the returned
  url); no client-side Stripe.js reads a publishable key.
- The live `sk_live_…` was pasted into an assistant chat during setup. Recommend the owner
  **rotate it** in the Stripe dashboard once comfortable; update the Vercel Production var
  with the rolled value afterward.

## To roll back (return to test mode)
Set Production `STRIPE_SECRET_KEY` back to the test `sk_test_…`, create/point a TEST-mode
webhook endpoint at the www URL, set `STRIPE_WEBHOOK_SECRET` to its test secret, redeploy.
(This is the inverse of this change; see `[[stripe-webhook-test-mode]]` for the test setup.)
