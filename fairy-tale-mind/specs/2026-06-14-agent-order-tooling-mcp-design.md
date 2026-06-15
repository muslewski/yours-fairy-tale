---
type: spec
summary: "An internal MCP server (composed with the existing Playwright MCP) that lets AI agents drive and inspect the full order lifecycle — create/read orders, run customer + studio + refund actions — against the Neon test branch, to reproduce and verify customer-flow issues fast. Tooling only; not a user-facing product. Stripe is synthesized at the app boundary (no real charges, no Stripe CLI)."
tags: [tooling, mcp, testing, orders, agent, playwright]
status: planned
created: 2026-06-14
updated: 2026-06-14
related: ["[[testing]]", "[[checkout]]", "[[studio]]", "[[auth-gating]]", "[[payload-backend]]"]
sources: []
origin: "brainstorming 2026-06-14"
---

# Agent order-tooling MCP — drive & inspect the full order lifecycle

**Date:** 2026-06-14

## Why

We now have an established application with a real order lifecycle (configurator →
Stripe Checkout → webhook creates the order → customer dashboard → studio panel →
delivery / refund). Debugging customer-flow issues by hand is slow: you have to drive a
browser, get an order into a particular state, sign in as the right customer, and read the
result. We want agents (e.g. Opus 4.8) to do this quickly and reliably.

Two motivating examples (the first things this harness must reproduce + verify):

1. **Form context lost on a cancelled checkout.** After Stripe's cancel return the browser
   lands on `cancel_url = ${baseUrl}/#build` (`lib/checkout.ts:67`); the configurator
   re-mounts with `useState` defaults, so the parent's entered selections are gone.
2. **No clear post-success confirmation.** After success the browser lands on
   `success_url = ${baseUrl}/app?session={CHECKOUT_SESSION_ID}` (`lib/checkout.ts:66`); the
   `session` param is never read and there is no explicit "order complete — check your
   email" moment (`app/(site)/(app)/app/page.tsx`).

This is a **development/testing accelerator, not a user-facing product.** No public MCP, no
chat surface — just tools agents use to find issues fast.

## Goals / non-goals

**Goals**
- An MCP server, in the repo, that exposes order-lifecycle tools agents can call.
- Cover the **full lifecycle**: create (paid), customer actions (photos, proof approve /
  revise, notes), studio actions (status with guardrails, attach proof / final video,
  delivery promise), and post-payment events (refund, dispute).
- Read tools to inspect order/DB state.
- Compose with the **existing Playwright MCP** for browser driving and UI assertions.
- Deterministic and safe: runs only against the Neon **test branch**, never prod, never
  real Stripe.

**Non-goals (this round)**
- Fixing the two example flows (separate follow-ups; this harness only reproduces +
  verifies them).
- A full real-Stripe test-mode loop (Stripe CLI forwarding, test cards). Out of scope; the
  app-side boundary is synthesized.
- Any user-facing / chat-facing MCP. Internal only.
- Re-implementing browser control (the Playwright MCP already does this).

## Decisions (from brainstorming)

- **Scope:** tooling only.
- **Stripe boundary:** app-side **synthesized**. The harness drives the real configurator +
  checkout route, simulates Stripe's return by navigating to the real success/cancel URLs,
  and materializes orders through the real `handleStripeEvent` with `livemode:false`
  synthetic events. No Stripe CLI, no network, no charges.
- **Architecture:** a dedicated **in-process MCP server** (boots Payload's Local API once
  against the test branch) **composed with the existing Playwright MCP**. The server owns
  *order state*; Playwright owns *the browser*.
- **Surface:** **expanded** — full lifecycle incl. studio + refund.
- **Environment:** local app server + the existing Neon **test branch** (`.env.test`).

## Architecture

A new MCP server at `tools/agent-mcp/` (Node, MCP over stdio), registered in the project's
MCP config so agents connect to it. It:

- Boots Payload's Local API **once** (memoized like `lib/payload.ts`), pointed at the Neon
  **test branch** via `.env.test`, reusing the same module-loading path the vitest suite
  already uses to boot Payload out-of-process (so the `@/` aliases + extensionless Payload
  config resolve correctly).
- Imports the **real app code** so behavior matches production exactly — it wraps the
  headless `*Core` functions, never the auth-guarded server actions:
  - `handleStripeEvent` — `app/api/stripe/webhook/route.ts:104` (create / refund / dispute)
  - `buildCheckoutSessionParams`, `computeTotalCents` — `lib/checkout.ts`
  - `applyOrderStatusCore`, `applyPromisedByCore`, `attachVideoCore`
    — `lib/studio-order-mutations.ts:30,78,119`
  - `appendCustomerNote` — `lib/order-actions.ts:204`
  - the customer-action cores (extracted — see Enabling refactor)
  - `getOrderForOwner` / order reads — `lib/customer-data.ts`
  - `seedCustomer` — `e2e/fixtures/seed.ts`
- **Does not drive the browser.** Agents use the existing Playwright MCP for UI.

### Safety invariant (hard)

The server **refuses to boot unless the DB is the test branch.** It asserts a `.env.test`
marker / test-branch host before opening Payload, so it can never touch prod. All
synthesized Stripe events are `livemode:false`. Emails route to the existing test sink (the
e2e magic-link file sink), never real inboxes. Tools that mutate are limited to the test
namespace; `reset_test_db` prunes harness-created data. This invariant is the one thing the
implementation must enforce before anything else and must be covered by a test.

## Tool surface (v1, full lifecycle)

Every tool maps to a real, headless-callable seam.

### Create & inspect
- **`create_order`** — materialize a paid order. Input: customer email + configurator
  selections (`childName`, `world`, `length`, `detailLevel`, `extraMinutes`, `addOns`,
  `plotNote`); optional `status` override; optional `mode: "webhook" | "seed"` (default
  `webhook`). `webhook` builds a synthetic `checkout.session.completed` (using the real
  metadata mapping from `buildCheckoutSessionParams`) and runs it through
  `handleStripeEvent` — exercising user upsert, order create, `promisedBy`, and the magic
  tracking link. Threads a **known `stripeSessionId` + `stripePaymentIntentId`** so later
  refund/dispute tools can target the same order. Returns `{orderId, owner, status,
  sessionId, paymentIntentId, trackingLink}`.
- **`get_order`** — full order state by id (status, fields, `assets[]`, `proof`/`finalVideo`
  presence, `customerNotes`, `revisionNote`, owner, timestamps). Via Payload Local API.
- **`list_orders`** — by owner email or recent-all; for sweeping state.
- **`get_checkout_intent`** — pure / no side effects: given selections, return computed
  amount (cents), the exact `success_url` and `cancel_url`, and the metadata. Lets an agent
  reason about the redirect targets (directly relevant to both example bugs) without a
  browser.

### Customer actions
- **`upload_photos`** — attach photo(s) to an order (→ auto-advances `awaiting_assets` →
  `in_production`). Exercises the media→Blob pipeline. Wraps the extracted
  `uploadOrderAssetsCore`.
- **`approve_proof`** — set status → `approved`. Wraps the extracted `approveProofCore`.
- **`request_proof_change`** — set status → `revisions`, save `revisionNote`. Wraps the
  extracted `requestProofChangeCore`.
- **`add_customer_note`** — append to `customerNotes`. Wraps `appendCustomerNote`
  (`lib/order-actions.ts:204`).

### Studio actions
- **`set_status`** — move an order to a target status with the **real workflow guardrails**
  (`proof_ready` requires `order.proof`; `delivered` requires `order.finalVideo`). Wraps
  `applyOrderStatusCore` (`lib/studio-order-mutations.ts:30`).
- **`attach_proof`** — create a media doc and link `order.proof` (enables `proof_ready`).
  Wraps `attachVideoCore({kind:"proof"})`. Accepts a test blob pathname (the harness seeds a
  small test video into the test blob, or supplies synthetic `BlobMeta`).
- **`attach_final_video`** — same for `order.finalVideo` (enables `delivered`). Wraps
  `attachVideoCore({kind:"finalVideo"})`.
- **`set_promised_by`** — set/override the delivery promise. Wraps `applyPromisedByCore`.

### Post-payment
- **`simulate_refund`** — synthesize `charge.refunded` for the order's
  `stripePaymentIntentId` → `handleStripeEvent` → status `refunded`.
- **`simulate_dispute`** — synthesize `charge.dispute.created` → `handleStripeEvent` →
  status `cancelled`.

### Auth & utility
- **`mint_login_link`** — produce a magic sign-in link for a customer so Playwright can
  authenticate as the owner and inspect `/app` (reuses the order tracking-link / magic-link
  mechanism).
- **`reset_test_db`** — prune/reset harness-created orders + users for isolated runs
  (reuses the test-branch reset the vitest setup already performs).

## Enabling refactor (small, convention-consistent)

The studio side already splits auth-guarded actions from headless `*Core` functions so DB
tests can call them without a session (`lib/studio-order-mutations.ts`). The customer
actions in `lib/order-actions.ts` are **not** yet split. Extract headless cores —
`uploadOrderAssetsCore`, `approveProofCore`, `requestProofChangeCore` — that contain the
existing logic minus `assertOwnsOrder()`; the public server actions keep `assertOwnsOrder()`
and delegate to their core. This mirrors the studio pattern exactly, is independently
useful for unit tests, and lets the harness drive customer actions without faking a
customer session. No behavior change for real customers.

## Data flow — reproducing the two example bugs

**Post-success confirmation**
1. `create_order(email, selections)` → `{orderId, sessionId, trackingLink}` (order now
   `paid` in the test branch).
2. `mint_login_link(email)` → magic link.
3. Playwright MCP: open the magic link (authed) → navigate to the real `success_url`
   (`/app?session={sessionId}`).
4. Playwright MCP: read the page → assert presence/absence of a clear "order complete —
   check your email" message. → surfaces the gap.

**Lost form on cancel**
1. Playwright MCP: fill configurator steps 1–2.
2. `get_checkout_intent(selections)` → exact `cancel_url`.
3. Playwright MCP: navigate to `cancel_url` (`/#build`) → assert whether entered fields
   survive. → surfaces the loss.

In both, this server supplies *state + exact URLs*; Playwright performs and asserts *the UI*.

## Testing the tooling

- **vitest** suite driving each tool handler against the test branch: `create_order` →
  `get_order` round-trip; `upload_photos` → `assets` + status advance; full status walk
  `paid → … → delivered` through `set_status` + `attach_proof` + `attach_final_video`
  (asserting guardrails reject `proof_ready` without a proof, `delivered` without a final);
  `simulate_refund` / `simulate_dispute` → `refunded` / `cancelled`. Handlers are thin
  wrappers over already-tested libs, so these are integration smoke checks.
- **One Playwright Layer-B spec** runs the full agent loop end-to-end (`create_order` →
  `mint_login_link` → success landing) as a regression guard and living example.
- A dedicated test for the **safety invariant**: the server refuses to boot against a
  non-test DB.

## Mind impact (on finish)

- New zone card `agent-tooling` (the MCP server, its tools, the test-branch safety
  invariant, the compose-with-Playwright pattern, file seams).
- Re-stamp `[[testing]]` (currently ⚠ stale) — it gains the agent harness.
- Decision records: "synthesized Stripe boundary for the agent harness" and "in-process MCP
  + existing Playwright MCP (don't reinvent browser control)".
- `npm run mind` + commit the regenerated `map/index.md`.

## Risks / open considerations

- **Payload boot in a standalone process.** Reuse the exact loader the vitest suite uses;
  if that proves awkward for a long-lived MCP process, fall back to the per-call seed-runner
  pattern for the affected tools (slower but proven). To be settled in the plan.
- **MCP registration ergonomics.** Where the server is registered (repo `.mcp.json` vs the
  agent's own config) and how it's started (`tsx tools/agent-mcp/...`) — a plan detail.
- **Test-branch contention.** The suite serializes DB access already; the MCP server must
  respect the same single-writer assumption (don't run it concurrently with the test suite
  against the same branch).
- **`attach_proof` blob source.** Decide whether to ship a tiny fixture video uploaded to
  the test blob vs. synthesize `BlobMeta` for a non-existent pathname (the core doesn't
  re-validate). Plan detail.
