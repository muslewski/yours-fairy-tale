---
type: decision
title: "Stripe webhook creates checkout-gated customer accounts"
status: accepted
date: 2026-06-03
tags: [stripe, webhook, auth, orders, accounts]
related: ["[[checkout]]", "[[payload-backend]]"]
---

## Context
We need customer accounts to exist so buyers can access a dashboard showing their order status.
We also want to prevent bot/spam sign-ups and ensure we only have accounts for people who paid.

## Decision
Customer accounts come **exclusively** from the `checkout.session.completed` Stripe webhook — there is no public sign-up path. The webhook:

1. Verifies the Stripe signature using the raw body (`req.text()`) and `stripe.webhooks.constructEvent`.
2. Upserts a `users` row by email (`emailVerified: true` — payment proves ownership).
3. Creates an `orders` row linked to that user, idempotent on `stripeSessionId`.

`STRIPE_WEBHOOK_SECRET` is read lazily (inside the POST handler, not at module top) so importing the module in a dev environment with an incomplete `.env` does not throw at load time.

## Consequences
- No duplicate accounts: user lookup by email before create.
- No duplicate orders: existence check on `stripeSessionId` before create — safe to retry Stripe delivery.
- `handleStripeEvent` is exported separately (HTTP-free) for unit testing without spinning up an HTTP server.
- Refund handling and email notification are deferred (separate tasks).
