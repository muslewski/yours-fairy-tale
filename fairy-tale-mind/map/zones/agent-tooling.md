---
type: zone
summary: "A repo-local MCP server that lets AI agents create, drive, and inspect the full order lifecycle (customer + studio + refund) against the Neon test branch — composed with the existing Playwright MCP for UI. 16 tools, HTTP transport on port 39199, vite-node loader, synthesized Stripe events, hard boot guard."
tags: [tooling, mcp, testing, orders, agent]
status: active
created: 2026-06-14
updated: 2026-06-16
related: ["[[testing]]", "[[checkout]]", "[[studio]]", "[[auth-gating]]", "[[payload-backend]]"]
sources:
  - "fairy-tale-mind/specs/2026-06-14-agent-order-tooling-mcp-design.md"
  - "fairy-tale-mind/plans/2026-06-14-agent-order-tooling-mcp.md"
owns:
  routes: []
  anchors: []
  globs:
    - "tools/agent-mcp/**"
    - "lib/order-action-cores.ts"
    - "tests/agent-mcp/**"
    - "e2e/agent-loop.spec.ts"
    - ".mcp.json"
depends: ["[[testing]]", "[[checkout]]", "[[studio]]", "[[payload-backend]]"]
invariants:
  - rule: "The server refuses to boot unless .env.test is present AND AGENT_MCP_CONFIRM_TEST_DB=1 is set — it can never run against a non-test DB. Also refuses when VERCEL_ENV=production."
    enforcedBy: ["tools/agent-mcp/guard.ts", "tests/agent-mcp/guard.test.ts"]
  - rule: "All synthesized Stripe events carry livemode:false — no real charges, no real Stripe network calls."
    enforcedBy: ["tools/agent-mcp/lib/synthetic-stripe.ts"]
  - rule: "The server entry (server.ts) imports bootstrap-env FIRST — env + guard must run before any Payload import, because payload.config.ts reads process.env at module eval time."
    enforcedBy: ["tools/agent-mcp/server.ts", "tools/agent-mcp/bootstrap-env.ts"]
verifiedAt: a50353d
---

## Purpose

An internal debugging harness: lets AI agents create/drive/inspect the full order lifecycle
against the **Neon test branch** without a browser, composed with the existing Playwright MCP
for UI steps. Agents use this to reproduce and verify customer-flow issues fast (e.g. the
post-success confirmation gap, the cancelled-checkout form-context loss).

Not a user-facing product — never deployed, never public, never a real-Stripe loop.

## Architecture

### MCP server (`tools/agent-mcp/`)

The server (`tools/agent-mcp/server.ts`) runs under **`vite-node`** (not bare Node, not `tsx`):
Payload's ESM-only config (`payload.config.ts`) uses extensionless imports and `@/`/`@payload-config`
aliases that crash bare Node and tsx, but Vite's loader (already proven by the vitest + seed
fixtures) resolves them correctly. The `vite.config.ts` mirrors `e2e/fixtures/seed.vitest.config.ts`
with the same two aliases.

Transport is **HTTP** (port 39199, path `/mcp`), not stdio: Payload logs to stdout, which would
corrupt a stdio MCP frame. All MCP logging uses `console.error` (stderr). Registered via
`.mcp.json` at the repo root.

### Safety boot sequence

`tools/agent-mcp/bootstrap-env.ts` is a side-effect module imported **first** in `server.ts`:
1. `loadAgentEnv()` — reads `.env.test` (refuses if absent); never reads `.env`.
2. `assertTestDatabase()` — checks `DATABASE_URI`/`POSTGRES_URL` is set, `VERCEL_ENV ≠ production`,
   and `AGENT_MCP_CONFIRM_TEST_DB === "1"`.

Only after this guard passes does `server.ts` dynamically import `register.ts`, which pulls in
the tools and the Payload Local API.

### Headless-`*Core` wrapping pattern

The server never calls auth-guarded server actions. It wraps headless cores:

- **Customer side** (`lib/order-action-cores.ts`): `uploadOrderAssetsCore`, `approveProofCore`,
  `requestProofChangeCore` — extracted from `lib/order-actions.ts` (the enabling refactor for
  this harness). Public server actions still call `assertOwnsOrder()` then delegate to their core.
  Mirrors the studio's existing `lib/studio-order-mutations.ts` split exactly.
- **Studio side** (`lib/studio-order-mutations.ts`): `applyOrderStatusCore`, `applyPromisedByCore`,
  `attachVideoCore` — these already existed as headless functions.
- **Stripe boundary** (`app/api/stripe/webhook/route.ts:handleStripeEvent`): the harness calls this
  directly with synthetic `livemode:false` events — the real handler path, no Stripe CLI, no network.

### Compose-with-Playwright pattern

This server owns **order state** (create, mutate, read); the existing Playwright MCP owns **the
browser**. Agents compose both: `create_order` → state in DB; `mint_login_link` → magic URL;
Playwright navigates + asserts. Neither side reimplements the other.

## Tool surface (16 tools)

### Create & inspect
- **`create_order`** — synthetic `checkout.session.completed` → `handleStripeEvent` → paid order
  in the test branch. Supports optional `status` override and `mode: "webhook" | "seed"`.
- **`get_order`** — full order state by id via Payload Local API.
- **`list_orders`** — by owner email or recent-all.
- **`get_checkout_intent`** — pure/no-DB: given configurator selections, returns computed amount
  (cents), the exact `success_url`, `cancel_url`, and Stripe metadata.

### Customer actions
- **`upload_photos`** — reads image files from disk, attaches to order assets; auto-advances
  `awaiting_assets` → `in_production`.
- **`approve_proof`** — sets status → `approved`.
- **`request_proof_change`** — sets status → `revisions`, saves `revisionNote`.
- **`add_customer_note`** — appends to `customerNotes`.

### Studio actions
- **`set_status`** — moves order through the workflow with **real guardrails** (`proof_ready`
  requires `order.proof`; `delivered` requires `order.finalVideo`).
- **`attach_proof`** — metadata-only media doc + links `order.proof` (enables `proof_ready`).
- **`attach_final_video`** — same for `order.finalVideo` (enables `delivered`).
- **`set_promised_by`** — sets/overrides the delivery promise date.

### Post-payment
- **`simulate_refund`** — synthetic `charge.refunded` → `handleStripeEvent` → status `refunded`.
- **`simulate_dispute`** — synthetic `charge.dispute.created` → `handleStripeEvent` → status
  `cancelled`.

### Auth & utility
- **`mint_login_link`** — produces a magic sign-in link so Playwright can authenticate as the
  customer owner (reuses `createOrderTrackingLink`).
- **`reset_test_db`** — deletes orders whose `stripeSessionId` starts with `cs_agent_` or
  `cs_seed_` (harness-created) for isolated runs.

## Tests

- `tests/agent-mcp/guard.test.ts` — 4 unit tests for the safety invariant (no DB needed).
- `tests/agent-mcp/synthetic-stripe.test.ts` — event shape tests (pure, no DB).
- `tests/agent-mcp/cores.test.ts` — integration tests for the three customer cores (DB-backed).
- `tests/agent-mcp/orders.test.ts` — `createOrder`/`getOrder`/`listOrders`/`getCheckoutIntent` round-trips.
- `tests/agent-mcp/customer.test.ts` — photo upload + approve/revise/note flow (DB-backed).
- `tests/agent-mcp/studio.test.ts` — `set_status` guardrails + `attach_proof`/`attach_final_video`/`set_promised_by`.
- `tests/agent-mcp/payments.test.ts` — `simulate_refund` → `refunded`, `simulate_dispute` → `cancelled`.
- `tests/agent-mcp/auth-maintenance.test.ts` — `mintLoginLink` returns a token URL; `resetTestDb` removes harness orders.
- `tests/agent-mcp/register.test.ts` — all 16 tool names are wired on the `McpServer`.
- `e2e/agent-loop.spec.ts` — Playwright Layer-B end-to-end: `create_order` → `mint_login_link` → success landing shows the order.

## How to run

1. Add `AGENT_MCP_CONFIRM_TEST_DB=1` to `.env.test`.
2. Start the test app server: `npm run build && npx next start -p 3100`.
3. Start the MCP server: `npm run agent:mcp` (listens on `http://localhost:39199/mcp`).
4. Connect via `.mcp.json` (HTTP transport).

## Lineage

Designed 2026-06-14 (`[[2026-06-14-agent-order-tooling-mcp-design]]`, origin: brainstorming);
planned + implemented in tasks 1–10 of `[[2026-06-14-agent-order-tooling-mcp]]`. The enabling
refactor (extract customer cores, Task 2) mirrors the pre-existing studio split exactly. Key
decisions: see `[[2026-06-14-agent-mcp-synthesized-stripe]]` (why `handleStripeEvent` with
`livemode:false`) and `[[2026-06-14-agent-mcp-vite-node-http-transport]]` (why `vite-node` +
HTTP transport).
