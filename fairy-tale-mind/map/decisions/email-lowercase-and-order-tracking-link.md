---
type: decision
summary: "Two fixes from the post-checkout debugging. (1) User emails are stored lowercase (Users field hook + webhook), because Better Auth looks up with email.toLowerCase() and Postgres equality is case-sensitive — a mixed-case stored email failed sign-in (new_user_signup_disabled). (2) The order confirmation email now carries a one-click 'track your order' magic link that mints a verification in BA's exact format and wraps it through the scanner-safe interstitial, instead of a plain /sign-in link."
tags: [auth, checkout, email, bugfix]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[auth-gating]]", "[[checkout]]", "[[magic-link-confirmation-interstitial]]"]
sources: []
decided: 2026-06-04
supersededBy: ""
---

## Context
After fixing magic-link scanner consumption, sign-in still failed with
`new_user_signup_disabled`. Root cause turned out to be upstream: the Stripe
webhook wasn't firing in prod at all (a Stripe mode mismatch, see
`[[stripe-webhook-test-mode]]`), so no account existed. While investigating we
also found and reproduced a latent **email-case** bug, and the owner asked for a
one-click order-tracking link in the confirmation email.

## Decision 1 — lowercase emails
Better Auth's `findUserByEmail` queries with `email.toLowerCase()`, but the webhook
stored the raw Stripe email and Postgres `=` is case-sensitive, so any mixed-case
account could never be found at sign-in. Fix: the `users.email` field has a
`beforeValidate` hook that trims + lowercases on every write (covers the webhook,
seed, admin, and the BA adapter's creates), and the webhook also lowercases the
resolved email before its upsert query. Storage and lookup stay aligned.

Existing mixed-case rows (if any) need a one-time `UPDATE users SET email =
lower(email)` — tracked in `[[existing-mixedcase-emails-migration]]`. Low priority:
the hook covers all new accounts and no known mixed-case account exists.

## Decision 2 — one-click tracking link
`lib/order-tracking-link.ts` mints a verification row in Better Auth's exact
magic-link shape (storeToken: "plain" → identifier = raw 32-char token; value =
JSON `{email}`; `expiresAt` 7 days) and returns a `toConfirmSignInUrl`-wrapped URL.
The order confirmation email uses it as the "Track your order" CTA. Clicking it
goes through the scanner-safe `/sign-in/verify` interstitial, then BA's real verify
endpoint consumes it and drops the parent into `/app` — one click from the email,
no second sign-in step.

We mint our own verification (rather than calling `auth.api.signInMagicLink`, which
would send a SECOND email) because BA exposes no "generate link without sending".
`tests/auth/order-tracking-link.test.ts` drives a generated link through BA's real
verify endpoint, so any drift in BA's verification format breaks the test.

## Consequences
- New auth-adjacent code that creates users must not bypass the email lowercasing
  (the field hook protects most paths; raw SQL inserts would not).
- The 7-day single-use tracking link is consumed on first human click; afterward
  the parent uses normal sign-in.
- If BA changes its magic-link storage format on upgrade, the tracking-link test
  fails — update `lib/order-tracking-link.ts` to match.
