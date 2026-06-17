---
type: zone
summary: "Stripe checkout integration — mock UI simulation + real Checkout Session route + webhook that creates accounts, orders, sends confirmation email, and syncs refund/dispute status."
tags: [ui, checkout, stripe, api, webhook, orders]
status: active
created: 2026-06-02
updated: 2026-06-16
related: ["[[configurator]]", "[[payload-backend]]", "[[studio]]", "[[delivery-promise-auto-from-length]]", "[[auth-gating]]", "[[2026-06-16-in-studio-live-card]]", "[[2026-06-17-durable-order-access-link]]"]
sources: ["[[checkout-is-a-simulation]]", "[[payments-stripe-over-shopify]]", "[[stripe-checkout-session-route]]", "[[webhook-orphan-events-retry]]"]
owns:
  routes:
    - "/api/stripe/checkout"
    - "/api/stripe/webhook"
    - "/order-confirmed"
  anchors: []
  globs:
    - "components/checkout/*"
    - "app/(site)/order-confirmed/*"
    - "lib/stripe.ts"
    - "lib/checkout.ts"
    - "lib/pricing.ts"
    - "lib/email.ts"
    - "lib/order-status-email.ts"
    - "app/api/stripe/checkout/route.ts"
    - "app/api/stripe/webhook/route.ts"
    - "collections/Orders.ts"
    - "tests/stripe/checkout.test.ts"
    - "tests/stripe/checkout-route.test.ts"
    - "tests/lib/checkout.test.ts"
    - "tests/app/status-email-link.test.ts"
    - "tests/stripe/webhook.test.ts"
    - "tests/stripe/refund-email.test.ts"
    - "tests/lib/pricing.test.ts"
    - "tests/app/status-emails.test.ts"
depends: ["[[payload-backend]]"]
invariants:
  - rule: "The mock UI (components/checkout/*) never makes network calls or charges money — simulation only. It is NO LONGER on the live configurator flow."
    enforcedBy: []
  - rule: "The charge amount is computed SERVER-SIDE via computeTotalCents(selections) — the request body carries selections, never a price. A tampered client cannot change what they pay."
    enforcedBy: ["tests/stripe/checkout.test.ts", "tests/lib/pricing.test.ts"]
  - rule: "Invalid selections (unknown length/detail/add-on, out-of-range minutes) → computeTotalCents throws → route returns 400."
    enforcedBy: ["tests/lib/pricing.test.ts"]
  - rule: "STRIPE_SECRET_KEY must be set; singleton throws at boot if missing."
    enforcedBy: ["lib/stripe.ts"]
  - rule: "buildCheckoutSessionParams is pure — no network calls, safe to unit-test."
    enforcedBy: ["tests/stripe/checkout.test.ts"]
  - rule: "Session metadata must carry all seven config fields: childName, world, length, detailLevel, extraMinutes (string), addOns (comma-joined string), plotNote (capped at 500 chars)."
    enforcedBy: ["tests/stripe/checkout.test.ts"]
  - rule: "Orders length/detailLevel/world enums match the configurator vocabulary exactly: length [short,medium,long], detailLevel [basic,detailed,premium], world [bedtime,space,sea,forest,dragons,birthday,custom]."
    enforcedBy: ["tests/stripe/webhook.test.ts"]
  - rule: "success_url must include the {CHECKOUT_SESSION_ID} Stripe template literal."
    enforcedBy: ["tests/stripe/checkout.test.ts"]
  - rule: "Webhook reads STRIPE_WEBHOOK_SECRET lazily inside POST (not at module top) so importing in dev with empty env doesn't throw."
    enforcedBy: ["app/api/stripe/webhook/route.ts"]
  - rule: "Webhook is idempotent on stripeSessionId — duplicate events create no second order."
    enforcedBy: ["tests/stripe/webhook.test.ts"]
  - rule: "User upsert by email — never creates a duplicate users row; emailVerified:true on new users (payment proves email ownership)."
    enforcedBy: ["tests/stripe/webhook.test.ts"]
  - rule: "The webhook stamps amountTotalCents (what Stripe ACTUALLY charged, from the session) and promisedBy (purchase time + the length's window via promisedByForLength) on the new order. The studio's revenue numbers and the customer countdown read these stored fields — neither is recomputed later."
    enforcedBy: ["tests/stripe/webhook.test.ts", "tests/lib/delivery.test.ts"]
  - rule: "No public sign-up path exists — customer accounts come ONLY from this webhook."
    enforcedBy: []
  - rule: "Confirmation email failure never blocks order creation — errors are logged, not thrown."
    enforcedBy: ["tests/stripe/refund-email.test.ts"]
  - rule: "Dev email always routes to RESEND_TO_OVERRIDE when set; subject prefixed with real recipient."
    enforcedBy: ["tests/stripe/refund-email.test.ts"]
  - rule: "charge.refunded → order status 'refunded'; charge.dispute.created → 'cancelled'. An event with NO matching order THROWS (→ POST 500 → Stripe retries with backoff): Stripe does not guarantee ordering, so the refund/dispute may precede checkout.session.completed. Only events missing a payment_intent (can never match) are warn-and-return."
    enforcedBy: ["tests/stripe/webhook.test.ts", "tests/stripe/refund-email.test.ts"]
  - rule: "Email config fails LOUD in production: sendEmail throws when RESEND_API_KEY or RESEND_FROM is missing under NODE_ENV=production (dev keeps warn+skip / the resend.dev sandbox sender)."
    enforcedBy: ["lib/email.ts"]
  - rule: "stripePaymentIntentId must be indexed for O(1) refund/dispute lookups."
    enforcedBy: ["collections/Orders.ts"]
  - rule: "Status-transition email fires ONLY on update + real status change + proof_ready or delivered. All other transitions (including create) are silent."
    enforcedBy: ["tests/app/status-emails.test.ts"]
  - rule: "Status-transition email failure never blocks the order update — errors are logged, not thrown."
    enforcedBy: ["tests/app/status-emails.test.ts"]
verifiedAt: ad57454
---

## Purpose
Two-layer checkout:

1. **UI simulation** (`components/checkout/*`) — a fully client-side mock of the
   Stripe Checkout experience. Triggered from `[[configurator]]` after the user
   completes personalisation. No real payment processing; for demos and previews.

2. **Real Stripe Checkout Session route** (`POST /api/stripe/checkout`) — thin Next.js
   route handler that validates the body and delegates all param shaping to the pure
   builder `lib/checkout.ts`. Returns `{ url }` for the client to redirect to.
   A companion webhook (separate task) will consume `checkout.session.completed` and
   create the Customer + Order records using the session `metadata`.

## Key design choices
- `lib/stripe.ts` — SDK singleton; throws at import time if `STRIPE_SECRET_KEY` is absent.
- `lib/checkout.ts` — pure `buildCheckoutSessionParams(selections)`; no network, fully
  unit-testable (see `[[stripe-checkout-session-route]]` decision). Takes the buyer's
  SELECTIONS, prices them via `computeTotalCents`, and builds a single `price_data` line
  item (`unit_amount` + `product_data.name`/`description` from `summarizeSelections`).
- `lib/pricing.ts` — the shared, server-usable pricing model (single source of truth);
  `computeTotalCents` is the authoritative amount. The old `$49`/`STRIPE_VIDEO_PRICE_CENTS`
  placeholder is REMOVED — price is always configured.
- API version pinned to `2026-05-27.dahlia` (latest in stripe@22.2.0).

## Webhook (`POST /api/stripe/webhook`)
Handles three event types via `handleStripeEvent` (exported, HTTP-free, safe to unit-test):

### `checkout.session.completed`
Enacts the "checkout-gated, no public sign-up" model:
1. **Signature verification** — `stripe.webhooks.constructEvent(rawBody, sig, secret)` with
   raw body via `req.text()` (never `req.json()`, which would break the HMAC). Secret read
   lazily inside the handler (not at module top) — returns 500 if missing at request time.
2. **Idempotency** — checks for an existing `orders` row with the same `stripeSessionId`
   before doing any DB work; returns early on duplicate.
3. **Upsert user** — finds `users` by email (from `customer_details.email` or
   `customer_email`); creates one with `emailVerified: true` if absent.
4. **Create order** — links to the user via `owner`, stores `stripeSessionId`,
   `stripePaymentIntentId`, the seven config fields from metadata (childName, world, length,
   detailLevel, extraMinutes, addOns, plotNote), plus `amountTotalCents` (the session's
   `amount_total` — what Stripe actually charged) and `promisedBy` (purchase time + the
   length's production window via `promisedByForLength` in `lib/delivery.ts`), and lets
   `status` default to `"paid"`.
   The `orders` schema and the webhook also carry `inStudioSince` (a nullable date stamped the first time an order enters production, never reset); see `[[2026-06-16-in-studio-live-card]]`.
5. **Confirmation email** — sends a "your video is on its way — sign in to track it" email
   via `lib/email.ts` (Resend), including the expected-by date when a promise was stamped
   ("We expect it to be ready by …"). Email failure is logged and never re-throws; the
   order is always the critical path.

### `charge.refunded`
Finds the order by `stripePaymentIntentId` (indexed). Sets `status: "refunded"`.
No matching order: **throw** → 500 → Stripe retries (out-of-order delivery safety).
Missing `payment_intent` on the event (can never match): log + return.

### `charge.dispute.created`
Same lookup. Sets `status: "cancelled"`. Same throw-for-retry on no match.

### Accepted failure mode (documented for on-call)
A permanently-orphaned event (e.g. a refund for an unrelated/pre-launch charge in
this Stripe account) retries for Stripe's full backoff window (~3 days), logging
"no order yet" each attempt, then surfaces as a failed webhook in the Stripe
dashboard. Benign and self-resolving — do not page; investigate only if the
payment_intent should have a real order. See `[[webhook-orphan-events-retry]]`.

## Email (`lib/email.ts`)
Thin Resend wrapper. Dev routing: if `RESEND_TO_OVERRIDE` is set, all mail goes to that
address with the real recipient prefixed to the subject (`[→ buyer@x.io] subject`).
Config guard is environment-split: in production a missing `RESEND_API_KEY` or
`RESEND_FROM` THROWS (silent mail loss would break magic-link sign-in — the only
sign-in path — with no symptom); in dev it warns and skips / falls back to the
`onboarding@resend.dev` sandbox sender. Boot-time env validation
(`[[prod-env-fail-closed]]`) guarantees both vars in prod before requests are served.

## Lineage
Seeded from the existing site at Mind setup. Real Stripe route added 2026-06-03.
Webhook (checkout-gated account creation) added 2026-06-03.
Confirmation email + refund/dispute status sync added 2026-06-03.
Status-transition emails (proof_ready, delivered) added via Orders afterChange hook 2026-06-03.
extraMinutes, addOns, and plotNote fields added to metadata → webhook → Orders pipeline 2026-06-04.
Order confirmation + status emails re-skinned through the shared branded template
(`lib/email-template.ts`) and now send from `hello@yoursfairytale.com`; `sendEmail` gained
`replyTo` (2026-06-04, see `[[branded-email-template]]`).
Webhook now lowercases the resolved email before upsert/create, and the order
confirmation email carries a one-click "track your order" magic link
(`lib/order-tracking-link.ts`) instead of a plain /sign-in link (2026-06-04, see
`[[email-lowercase-and-order-tracking-link]]`). The prod Stripe webhook endpoint
delivery (test-mode endpoint) is documented in `[[stripe-webhook-test-mode]]`.
Launch hardening (2026-06-10): orphan `charge.refunded` / `charge.dispute.created`
events flipped from silent-drop to throw-for-retry (see
`[[webhook-orphan-events-retry]]`), and `lib/email.ts` lost its silent prod
fallbacks — missing RESEND_API_KEY/RESEND_FROM now throw in production (see
`[[prod-env-fail-closed]]`).
Studio panel (2026-06-10): the webhook now stamps `amountTotalCents` + `promisedBy` on the
new order (migration `20260610_000001_order_amount_promise`), and the confirmation email
includes the expected-by date (see `[[delivery-promise-auto-from-length]]` and `[[studio]]`).
Pre-launch UX (2026-06-15, Phase 2): `success_url` now points at a new PUBLIC, auth/DB-free
`/order-confirmed` page (`app/(site)/order-confirmed/`) instead of the gated `/app` — it
reassures, sets email expectations (incl. a spam-folder note), and routes onward, robust to
the async webhook not having created the order yet. The unwrapped
`stripe.checkout.sessions.create` call is now wrapped: a Stripe/network failure returns a
clean `502` (was an unhandled 500). Guarded by `tests/lib/checkout.test.ts` (success_url) +
`tests/stripe/checkout-route.test.ts` (502).
Photos-before-checkout (2026-06-16, Phase 3): `buildCheckoutSessionParams` now also writes
`metadata.assetPaths` (≤6 blob pathnames, length-bounded ≤480 chars) from photos uploaded in
the configurator; the webhook reads them, `attachCheckoutAssets` (`lib/order-action-cores.ts`)
`head()`s each + creates metadata-only media + attaches to `order.assets`, and the order is
promoted `paid → in_production` when any attach (kills the awaiting_assets limbo). See
`[[2026-06-16-photos-before-checkout-association]]`.
Post-purchase UX (2026-06-16, Phase 4): the `proof_ready`/`delivered` status emails
(`lib/order-status-email.ts`) no longer link to a bare `/sign-in` — they mint a one-click
`createOrderTrackingLink` with `callbackURL=/app/orders/{id}`, so a click both signs the
parent in AND opens that order. The link-mint is inside the existing non-fatal try/catch
(`sendStatusTransitionEmail` now takes `orderId`). Guarded by `tests/app/status-email-link.test.ts`.
Durable order-access link (2026-06-17): both the webhook confirmation "track your order"
link AND the status emails now use `ensureOrderAccessToken(orderId)` → the durable, reusable
`/open/<token>` link (owned by `[[auth-gating]]`) instead of a single-use magic link, so the
parent's preview link works repeatedly for 30 days. `sendStatusTransitionEmail` now also
threads the afterChange hook's `req` into `ensureOrderAccessToken` to avoid a same-row
self-deadlock inside the hook transaction. The confirmation-email path in
`app/api/stripe/webhook/route.ts` calls `ensureOrderAccessToken` AFTER the order create has
committed (no hook transaction), so it passes no `req`. See
`[[2026-06-17-durable-order-access-link]]`.
Studio delivery links (2026-06-17): `collections/Orders.ts` gained `proofUrl` +
`finalVideoUrl` text fields (the studio's external delivery links — owned by `[[studio]]`,
see `[[2026-06-17-studio-delivery-link]]`). No checkout/webhook/email behavior changed.
