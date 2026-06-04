---
type: decision
summary: "Prod runs Stripe in TEST mode. The checkout→account→email pipeline broke because the only webhook endpoint was configured in LIVE mode, so test-mode checkout.session.completed events had no endpoint to deliver to (no account, no confirmation email, sign-in then failed). Fixed by creating a TEST-mode webhook endpoint (we_1Tehgx…) at https://www.yoursfairytale.com/api/stripe/webhook and setting prod STRIPE_WEBHOOK_SECRET to its test signing secret."
tags: [stripe, webhook, ops, infra]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[checkout]]"]
sources: []
decided: 2026-06-04
supersededBy: ""
---

## Context
After a checkout the customer got no confirmation email and no account, so sign-in
failed with `new_user_signup_disabled`. Diagnosis via the Stripe API (test-mode
key): recent `checkout.session.completed` events existed with `livemode: false`,
but there were ZERO test-mode webhook endpoints. The endpoint the owner had
configured (`we_1TeMUo…`, secret `whsec_AcMB…`) exists in LIVE mode. So test-mode
checkouts fired events that had nowhere to go → the webhook never ran.

## Decision
Run prod in Stripe TEST mode (appropriate for a pre-revenue prototype) and align
the webhook to it:
- Created a TEST-mode webhook endpoint `we_1TehgxPNnqZRtjXH2eEo7qVH` →
  `https://www.yoursfairytale.com/api/stripe/webhook`, events
  `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`.
- Set prod `STRIPE_WEBHOOK_SECRET` to that endpoint's **test** signing secret (the
  old value was the live secret, which can't verify test events).
- Redeployed prod and replayed the missed test checkouts via
  `stripe events resend <id> --webhook-endpoint we_1Tehgx…`.

## Operational notes
- The endpoint URL is the **www** apex-canonical host. Do NOT point a Stripe
  webhook at `https://yoursfairytale.com` (apex) — it 308-redirects to www and
  Stripe does not follow redirects, so delivery would fail.
- The live endpoint `we_1TeMUo…` is currently unused.

## To go LIVE later (real payments)
Switch prod `STRIPE_SECRET_KEY` (and publishable key) to live, verify the live
endpoint `we_1TeMUo…` URL is the www host, and set prod `STRIPE_WEBHOOK_SECRET` to
the live endpoint's signing secret. Then test a real purchase end-to-end.
