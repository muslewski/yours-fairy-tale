---
type: decision
summary: "The agent harness materializes orders by calling handleStripeEvent directly with synthetic livemode:false events — not through a real Stripe test-mode loop (no Stripe CLI, no network, no charges). This keeps the harness deterministic, instant, and safe to run in any environment while still exercising the exact same webhook handler path as production."
tags: [tooling, mcp, stripe, testing, agent]
status: active
created: 2026-06-14
updated: 2026-06-14
related: ["[[agent-tooling]]", "[[checkout]]"]
sources: ["[[2026-06-14-agent-order-tooling-mcp-design]]"]
decided: 2026-06-14
supersededBy: ""
---

## Context

The harness needs to materialize paid orders in the Neon test branch so agents can
exercise customer + studio + refund workflows. There are two approaches to simulate a
Stripe Checkout purchase:

1. **Real test-mode loop** — start `stripe listen --forward-to ...`, drive the UI through
   a real Checkout Session with a test card, wait for Stripe to deliver the webhook.
2. **Synthesized boundary** — build a realistic `checkout.session.completed` event with
   `livemode:false` and call `handleStripeEvent(event)` directly, bypassing Stripe's
   network and the CLI listener.

## Decision

Use the **synthesized boundary** (approach 2).

`tools/agent-mcp/lib/synthetic-stripe.ts` provides `buildCompletedSessionEvent`,
`buildRefundEvent`, and `buildDisputeEvent`. Each builds a minimal but structurally
accurate `Stripe.Event` (with `livemode: false`) whose fields match exactly what the real
webhook handler reads: `customer_email`, `payment_intent`, `metadata` (with the
configurator fields from `buildCheckoutSessionParams`), `amount_total`. The same shapes
are used in `tests/stripe/webhook.test.ts`.

`tools/agent-mcp/tools/orders.ts:createOrder` calls `handleStripeEvent` with the
synthetic event. `tools/agent-mcp/tools/payments.ts` does the same for `charge.refunded`
and `charge.dispute.created`.

## Rationale

- **Same handler, same path.** `handleStripeEvent` is the real production function from
  `app/api/stripe/webhook/route.ts`. The harness exercises user upsert, order creation,
  `promisedBy` calculation, magic tracking link, and refund/dispute status transitions —
  everything the handler does in production — without touching Stripe's network.
- **Deterministic + instant.** No Stripe CLI, no network round-trip, no webhook retry
  timing. A `create_order` call returns the `orderId` as soon as the handler resolves.
- **No credentials required beyond the test branch.** The harness needs only
  `DATABASE_URI` (test branch) and `PAYLOAD_SECRET`. It does NOT need `STRIPE_SECRET_KEY`
  or `STRIPE_WEBHOOK_SECRET` — the synthesized event bypasses signature verification.
- **Safe in any environment.** All events carry `livemode:false`, so even a
  misconfigured Stripe client could not accidentally charge anyone. The boot guard already
  enforces test-branch-only, but the `livemode:false` flag is a second line of defence.

## Consequences

- The harness does NOT test Stripe's signature verification (`stripe.webhooks.constructEvent`).
  That path is covered separately in `tests/stripe/webhook.test.ts` (which uses a real
  test-mode signing secret and a known event payload).
- If `handleStripeEvent` is refactored to read additional fields from the Stripe event
  object, the synthetic builders in `tools/agent-mcp/lib/synthetic-stripe.ts` must be
  updated to match.
- A full real-Stripe test-mode loop (Layer C, `@smoke`) remains a separate concern for the
  existing `e2e/smoke/purchase.spec.ts` — that spec uses `stripe listen` and a real test
  card. The two approaches are complementary.
