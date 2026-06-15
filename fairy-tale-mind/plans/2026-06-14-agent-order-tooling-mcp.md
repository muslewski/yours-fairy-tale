# Agent Order-Tooling MCP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A repo-local MCP server that lets AI agents create, drive, and inspect the full order lifecycle (customer + studio + refund) against the Neon **test branch**, composed with the existing Playwright MCP for UI — a fast, safe debugging harness.

**Architecture:** Tool *handlers* are plain async functions that wrap the app's existing headless `*Core` seams and `handleStripeEvent`; they are unit/integration-tested under **vitest** (the only loader proven to boot Payload on this stack). The **MCP server** (`tools/agent-mcp/server.ts`) runs under **`vite-node`** (Vite's loader — bare Node/tsx crash on Payload's ESM config + `@/` aliases) and exposes those handlers over the MCP **HTTP transport** (Payload logs to stdout, which would corrupt a stdio MCP). A hard safety guard refuses to boot unless `.env.test` is present and `AGENT_MCP_CONFIRM_TEST_DB=1`.

**Tech Stack:** TypeScript, Payload Local API, Stripe types, `@modelcontextprotocol/sdk`, `zod`, `vite-node`, vitest, Playwright.

**Spec:** `fairy-tale-mind/specs/2026-06-14-agent-order-tooling-mcp-design.md`

---

## File structure

**New files**
- `lib/order-action-cores.ts` — headless customer-action cores (NO `"use server"`): `uploadOrderAssetsCore`, `approveProofCore`, `requestProofChangeCore`, + `UploadFileSpec` / `UploadResult` types.
- `tools/agent-mcp/env.ts` — `loadAgentEnv()` (loads `.env.test` only).
- `tools/agent-mcp/guard.ts` — `assertTestDatabase()` safety invariant.
- `tools/agent-mcp/lib/synthetic-stripe.ts` — `buildCompletedSessionEvent`, `buildRefundEvent`, `buildDisputeEvent`.
- `tools/agent-mcp/tools/orders.ts` — `createOrder`, `getOrder`, `listOrders`, `getCheckoutIntent`.
- `tools/agent-mcp/tools/customer.ts` — `uploadPhotos`, `approveProofTool`, `requestProofChangeTool`, `addCustomerNote`.
- `tools/agent-mcp/tools/studio.ts` — `setStatus`, `attachProof`, `attachFinalVideo`, `setPromisedBy`.
- `tools/agent-mcp/tools/payments.ts` — `simulateRefund`, `simulateDispute`.
- `tools/agent-mcp/tools/auth.ts` — `mintLoginLink`.
- `tools/agent-mcp/tools/maintenance.ts` — `resetTestDb`.
- `tools/agent-mcp/bootstrap-env.ts` — side-effect module: runs `loadAgentEnv()` + `assertTestDatabase()` at import time (ordering: before any Payload import).
- `tools/agent-mcp/register.ts` — registers every handler on an `McpServer` instance (dynamic-imported after env bootstrap).
- `tools/agent-mcp/server.ts` — entry: `import "./bootstrap-env"` then start HTTP transport.
- `tools/agent-mcp/vite.config.ts` — Vite aliases for `vite-node` (mirrors `e2e/fixtures/seed.vitest.config.ts`).
- `tools/agent-mcp/README.md` — how to run + register + safety notes.
- `.mcp.json` — registers the HTTP MCP server for agents.
- `tests/agent-mcp/*.test.ts` — vitest coverage for cores, synthetic events, and each tool group.
- `e2e/agent-loop.spec.ts` — Playwright Layer-B end-to-end agent loop.

**Modified files**
- `lib/order-actions.ts` — actions delegate to the new cores (no behavior change for customers).
- `package.json` — add devDeps + `agent:mcp` script.
- `fairy-tale-mind/map/zones/*` + index — Mind maintenance (Task 11).

---

## Task 1: Dependencies, Vite config, env loader, and safety guard

**Files:**
- Modify: `package.json`
- Create: `tools/agent-mcp/vite.config.ts`, `tools/agent-mcp/env.ts`, `tools/agent-mcp/guard.ts`
- Test: `tests/agent-mcp/guard.test.ts`

- [ ] **Step 1: Add dependencies**

Run:
```bash
npm install --save-dev @modelcontextprotocol/sdk zod vite-node
```
Expected: the three packages appear under `devDependencies` in `package.json`.

- [ ] **Step 2: Add the run script**

In `package.json` `scripts`, add:
```json
"agent:mcp": "vite-node --config tools/agent-mcp/vite.config.ts tools/agent-mcp/server.ts"
```

- [ ] **Step 3: Create the Vite config (aliases that let Payload boot)**

Create `tools/agent-mcp/vite.config.ts`:
```ts
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

// Mirrors e2e/fixtures/seed.vitest.config.ts: Payload's ESM-only config and the
// `@/` / `@payload-config` aliases crash bare Node + tsx; Vite's loader is the
// one path proven to boot the Payload Local API on this stack.
export default defineConfig({
  resolve: {
    alias: {
      "@payload-config": fileURLToPath(
        new URL("../../payload.config.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("../../", import.meta.url)),
    },
  },
});
```

- [ ] **Step 4: Create the env loader**

Create `tools/agent-mcp/env.ts`:
```ts
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Load ONLY .env.test (the Neon test branch). Never .env. Refuses to proceed if
 * .env.test is absent — the harness must never run against a non-test DB.
 * `process.loadEnvFile` is built into Node (no dotenv dependency).
 */
export function loadAgentEnv(): void {
  const envTestPath = fileURLToPath(new URL("../../.env.test", import.meta.url));
  if (!existsSync(envTestPath)) {
    throw new Error(
      "[agent-mcp] .env.test not found — this harness runs ONLY against the Neon test branch.",
    );
  }
  process.loadEnvFile(envTestPath);
  // Magic links / Better Auth need a base URL; default to the e2e server port.
  process.env.BETTER_AUTH_URL ??= "http://localhost:3100";
}
```

- [ ] **Step 5: Write the failing guard test**

Create `tests/agent-mcp/guard.test.ts`:
```ts
import { afterEach, beforeEach, expect, test } from "vitest";

import { assertTestDatabase } from "@/tools/agent-mcp/guard";

const saved = { ...process.env };
beforeEach(() => {
  process.env.DATABASE_URI = "postgres://test-branch/neondb";
  process.env.AGENT_MCP_CONFIRM_TEST_DB = "1";
  delete process.env.VERCEL_ENV;
});
afterEach(() => {
  process.env = { ...saved };
});

test("passes when a DB is set and test-DB is confirmed", () => {
  expect(() => assertTestDatabase()).not.toThrow();
});

test("throws when confirmation flag is missing", () => {
  delete process.env.AGENT_MCP_CONFIRM_TEST_DB;
  expect(() => assertTestDatabase()).toThrow(/AGENT_MCP_CONFIRM_TEST_DB/);
});

test("throws in production", () => {
  process.env.VERCEL_ENV = "production";
  expect(() => assertTestDatabase()).toThrow(/production/);
});

test("throws when no database URL is set", () => {
  delete process.env.DATABASE_URI;
  delete process.env.POSTGRES_URL;
  expect(() => assertTestDatabase()).toThrow(/DATABASE_URI/);
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/guard.test.ts`
Expected: FAIL — `Cannot find module '@/tools/agent-mcp/guard'`.

- [ ] **Step 7: Implement the guard**

Create `tools/agent-mcp/guard.ts`:
```ts
/**
 * Hard safety invariant: the agent harness may operate ONLY against the Neon
 * test branch. This runs at boot before Payload is imported; if any check fails
 * the server never starts. Pure + synchronous so it is unit-testable.
 */
export function assertTestDatabase(): void {
  const uri = process.env.DATABASE_URI ?? process.env.POSTGRES_URL ?? "";
  if (!uri) {
    throw new Error(
      "[agent-mcp] No DATABASE_URI/POSTGRES_URL set — refusing to start.",
    );
  }
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("[agent-mcp] VERCEL_ENV=production — refusing to run in production.");
  }
  if (process.env.AGENT_MCP_CONFIRM_TEST_DB !== "1") {
    throw new Error(
      "[agent-mcp] AGENT_MCP_CONFIRM_TEST_DB must be '1' (set it in .env.test) — " +
        "refusing to start against an unconfirmed database.",
    );
  }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/guard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tools/agent-mcp/vite.config.ts tools/agent-mcp/env.ts tools/agent-mcp/guard.ts tests/agent-mcp/guard.test.ts
git commit -m "feat(agent-mcp): scaffolding — deps, vite-node config, env loader, test-DB safety guard"
```

---

## Task 2: Enabling refactor — extract headless customer-action cores

**Files:**
- Create: `lib/order-action-cores.ts`
- Modify: `lib/order-actions.ts:80-195`
- Test: `tests/agent-mcp/cores.test.ts`

Rationale: the studio side already separates auth-guarded actions from headless `*Core`
functions (`lib/studio-order-mutations.ts`); the customer actions do not. The cores must
live OUTSIDE the `"use server"` file (Next registers every async export of a `"use server"`
module as a POST-reachable action) and must NOT call `revalidatePath` (which throws outside
a Next request).

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/cores.test.ts`:
```ts
import { expect, test } from "vitest";

import { getPayloadClient } from "@/lib/payload";
import { seedCustomer, seedOrder } from "@/e2e/fixtures/seed";
import {
  approveProofCore,
  requestProofChangeCore,
  uploadOrderAssetsCore,
} from "@/lib/order-action-cores";

// 1x1 transparent PNG.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("uploadOrderAssetsCore appends an asset and advances awaiting_assets -> in_production", async () => {
  const user = await seedCustomer(`cores-${Date.now()}@x.io`);
  const order = await seedOrder(user.id, "awaiting_assets");

  const result = await uploadOrderAssetsCore(String(order.id), [
    { data: PNG_1x1, name: "a.png", mimetype: "image/png", size: PNG_1x1.byteLength },
  ]);
  expect(result.added).toBe(1);

  const p = await getPayloadClient();
  const after = await p.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
  expect(after.status).toBe("in_production");
  expect(Array.isArray(after.assets) ? after.assets.length : 0).toBe(1);
});

test("approveProofCore sets status to approved", async () => {
  const user = await seedCustomer(`cores2-${Date.now()}@x.io`);
  const order = await seedOrder(user.id, "proof_ready");
  await approveProofCore(String(order.id));
  const p = await getPayloadClient();
  const after = await p.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
  expect(after.status).toBe("approved");
});

test("requestProofChangeCore sets revisions + saves the note", async () => {
  const user = await seedCustomer(`cores3-${Date.now()}@x.io`);
  const order = await seedOrder(user.id, "proof_ready");
  await requestProofChangeCore(String(order.id), "Please make the dragon friendlier.");
  const p = await getPayloadClient();
  const after = await p.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
  expect(after.status).toBe("revisions");
  expect(after.revisionNote).toContain("friendlier");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/cores.test.ts`
Expected: FAIL — `Cannot find module '@/lib/order-action-cores'`.

- [ ] **Step 3: Create the cores module**

Create `lib/order-action-cores.ts`:
```ts
/**
 * Headless customer-action cores. NO "use server" here ON PURPOSE: Next registers
 * every async export of a "use server" module as a POST-reachable server action.
 * These cores skip the ownership guard (assertOwnsOrder) and revalidatePath so
 * they are safe to call from DB tests and the agent harness; the public actions
 * in lib/order-actions.ts wrap them with the guard + revalidation. Mirrors the
 * studio split in lib/studio-order-mutations.ts.
 */
import { getPayloadClient } from "@/lib/payload";
import { isServerAcceptedImage } from "@/lib/order-upload-validation";

export interface UploadFileSpec {
  data: Buffer;
  name: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  added: number;
  error?: string;
}

/** Append photos to an order's `assets`; first photos advance awaiting_assets -> in_production. */
export async function uploadOrderAssetsCore(
  orderId: string,
  files: UploadFileSpec[],
): Promise<UploadResult> {
  if (files.length === 0) {
    return { added: 0, error: "Please choose at least one photo to add." };
  }
  for (const file of files) {
    if (!isServerAcceptedImage(file.mimetype)) {
      return {
        added: 0,
        error: `"${file.name}" is in a format we can't process. Please use a JPEG or PNG.`,
      };
    }
  }

  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });

  const newAssetIds: string[] = [];
  for (const file of files) {
    const media = await payload.create({
      collection: "media",
      data: {},
      file: { data: file.data, name: file.name, mimetype: file.mimetype, size: file.size },
      overrideAccess: true,
    });
    newAssetIds.push(String(media.id));
  }

  const existing = Array.isArray(order.assets)
    ? order.assets.map((a) =>
        typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
      )
    : [];
  const nextStatus = order.status === "awaiting_assets" ? "in_production" : order.status;

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { assets: [...existing, ...newAssetIds], status: nextStatus },
    overrideAccess: true,
  });

  return { added: newAssetIds.length };
}

/** Set an order's status to `approved`. */
export async function approveProofCore(orderId: string): Promise<void> {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: "approved" },
    overrideAccess: true,
  });
}

/** Set an order's status to `revisions` and save the parent's note. */
export async function requestProofChangeCore(orderId: string, note: string): Promise<void> {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: "revisions", revisionNote: note?.trim() || null },
    overrideAccess: true,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/cores.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Refactor the public actions to delegate to the cores**

In `lib/order-actions.ts`, update the imports (add, near the other `@/lib` imports):
```ts
import {
  approveProofCore,
  requestProofChangeCore,
  uploadOrderAssetsCore,
  type UploadFileSpec,
  type UploadResult,
} from "@/lib/order-action-cores";
```
Remove the local `export interface UploadResult { ... }` block (now imported). Replace the bodies of `uploadOrderAssets`, `approveProof`, and `requestProofChange` so each = guard + core + revalidate:
```ts
export async function uploadOrderAssets(
  orderId: string,
  formData: FormData,
): Promise<UploadResult> {
  await assertOwnsOrder(orderId);

  const rawFiles = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  if (rawFiles.length === 0) {
    return { added: 0, error: "Please choose at least one photo to add." };
  }

  // Validate the whole batch first — all or nothing (unchanged customer guard).
  for (const file of rawFiles) {
    const check = validateUploadFile(file);
    if (!check.ok) {
      return { added: 0, error: check.error };
    }
  }

  const files: UploadFileSpec[] = [];
  for (const file of rawFiles) {
    files.push({
      data: Buffer.from(await file.arrayBuffer()),
      name: file.name,
      mimetype: file.type,
      size: file.size,
    });
  }

  const result = await uploadOrderAssetsCore(orderId, files);
  if (result.added > 0) {
    revalidatePath("/app");
    revalidatePath(`/app/orders/${orderId}`);
  }
  return result;
}

export async function approveProof(orderId: string): Promise<void> {
  await assertOwnsOrder(orderId);
  await approveProofCore(orderId);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}

export async function requestProofChange(orderId: string, note: string): Promise<void> {
  await assertOwnsOrder(orderId);
  await requestProofChangeCore(orderId, note);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}
```

- [ ] **Step 6: Run the full existing order-actions suite to verify no regression**

Run: `npm test -- tests/app/order-actions.test.ts`
Expected: PASS (all existing tests green — the public actions behave identically).

- [ ] **Step 7: Commit**

```bash
git add lib/order-action-cores.ts lib/order-actions.ts tests/agent-mcp/cores.test.ts
git commit -m "refactor(orders): extract headless customer-action cores (uploadOrderAssetsCore/approveProofCore/requestProofChangeCore)"
```

---

## Task 3: Synthetic Stripe event builders

**Files:**
- Create: `tools/agent-mcp/lib/synthetic-stripe.ts`
- Test: `tests/agent-mcp/synthetic-stripe.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/synthetic-stripe.test.ts`:
```ts
import { expect, test } from "vitest";

import {
  buildCompletedSessionEvent,
  buildDisputeEvent,
  buildRefundEvent,
} from "@/tools/agent-mcp/lib/synthetic-stripe";

test("completed-session event carries email, ids, and metadata", () => {
  const evt = buildCompletedSessionEvent({
    email: "p@x.io",
    sessionId: "cs_1",
    paymentIntentId: "pi_1",
    metadata: { childName: "Ada", world: "space", length: "short", detailLevel: "detailed" },
  });
  expect(evt.type).toBe("checkout.session.completed");
  expect(evt.livemode).toBe(false);
  const obj = evt.data.object as Record<string, unknown>;
  expect(obj.id).toBe("cs_1");
  expect(obj.payment_intent).toBe("pi_1");
  expect(obj.customer_email).toBe("p@x.io");
  expect((obj.metadata as Record<string, string>).world).toBe("space");
});

test("refund + dispute events carry the payment_intent", () => {
  const refund = buildRefundEvent("pi_1");
  expect(refund.type).toBe("charge.refunded");
  expect((refund.data.object as Record<string, unknown>).payment_intent).toBe("pi_1");

  const dispute = buildDisputeEvent("pi_1");
  expect(dispute.type).toBe("charge.dispute.created");
  expect((dispute.data.object as Record<string, unknown>).payment_intent).toBe("pi_1");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/synthetic-stripe.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the builders**

Create `tools/agent-mcp/lib/synthetic-stripe.ts`:
```ts
import type Stripe from "stripe";

/**
 * Build synthetic, livemode:false Stripe events that exercise the REAL
 * handleStripeEvent paths. Shapes mirror tests/stripe/webhook.test.ts so the
 * handler reads exactly the fields it expects.
 */
export interface CompletedSessionMetadata {
  childName?: string;
  world?: string;
  length?: string;
  detailLevel?: string;
  extraMinutes?: string;
  addOns?: string;
  plotNote?: string;
}

export function buildCompletedSessionEvent(args: {
  email: string;
  sessionId: string;
  paymentIntentId: string;
  amountTotalCents?: number;
  metadata: CompletedSessionMetadata;
}): Stripe.Event {
  return {
    id: `evt_${args.sessionId}`,
    type: "checkout.session.completed",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: {
      object: {
        id: args.sessionId,
        object: "checkout.session",
        payment_intent: args.paymentIntentId,
        customer_email: args.email,
        customer_details: null,
        amount_total: args.amountTotalCents ?? null,
        metadata: args.metadata,
      },
    },
  } as unknown as Stripe.Event;
}

export function buildRefundEvent(paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_refund_${paymentIntentId}`,
    type: "charge.refunded",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: { object: "charge", payment_intent: paymentIntentId } },
  } as unknown as Stripe.Event;
}

export function buildDisputeEvent(paymentIntentId: string): Stripe.Event {
  return {
    id: `evt_dispute_${paymentIntentId}`,
    type: "charge.dispute.created",
    object: "event",
    api_version: "2026-05-27.dahlia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    data: { object: { object: "dispute", payment_intent: paymentIntentId } },
  } as unknown as Stripe.Event;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/synthetic-stripe.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/agent-mcp/lib/synthetic-stripe.ts tests/agent-mcp/synthetic-stripe.test.ts
git commit -m "feat(agent-mcp): synthetic Stripe event builders (completed/refund/dispute)"
```

---

## Task 4: Orders tools — create / get / list / checkout-intent

**Files:**
- Create: `tools/agent-mcp/tools/orders.ts`
- Test: `tests/agent-mcp/orders.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/orders.test.ts`:
```ts
import { expect, test } from "vitest";

import { createOrder, getCheckoutIntent, getOrder, listOrders } from "@/tools/agent-mcp/tools/orders";

test("createOrder (webhook mode) materializes a paid order via the real handler", async () => {
  const email = `orders-${Date.now()}@x.io`;
  const res = await createOrder({ email, childName: "Ada", world: "space", length: "short", detailLevel: "detailed" });

  expect(res.orderId).toBeTruthy();
  expect(res.status).toBe("paid");
  expect(res.paymentIntentId).toMatch(/^pi_agent_/);

  const order = await getOrder(res.orderId);
  expect(order?.childName).toBe("Ada");
  expect(order?.stripePaymentIntentId).toBe(res.paymentIntentId);
});

test("createOrder honours a status override", async () => {
  const email = `orders2-${Date.now()}@x.io`;
  const res = await createOrder({ email, length: "short", status: "in_production" });
  expect(res.status).toBe("in_production");
});

test("listOrders by email returns the customer's orders", async () => {
  const email = `orders3-${Date.now()}@x.io`;
  await createOrder({ email, length: "short" });
  const list = await listOrders({ email });
  expect(list.length).toBeGreaterThanOrEqual(1);
});

test("getCheckoutIntent returns amount + the real success/cancel URLs", () => {
  const intent = getCheckoutIntent({
    childName: "Ada", world: "space", length: "short", detail: "detailed", extraMinutes: 0, addOns: [],
  });
  expect(typeof intent.amountCents).toBe("number");
  expect(intent.successUrl).toContain("/app?session={CHECKOUT_SESSION_ID}");
  expect(intent.cancelUrl).toContain("/#build");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/orders.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the orders tools**

Create `tools/agent-mcp/tools/orders.ts`:
```ts
import { handleStripeEvent } from "@/app/api/stripe/webhook/route";
import { buildCheckoutSessionParams, type CheckoutInput } from "@/lib/checkout";
import { getOrdersForOwner } from "@/lib/customer-data";
import type { OrderStatus } from "@/lib/order-stages";
import { getPayloadClient } from "@/lib/payload";
import { computeTotalCents } from "@/lib/pricing";
import { seedCustomer, seedOrder } from "@/e2e/fixtures/seed";
import { buildCompletedSessionEvent } from "../lib/synthetic-stripe";

export interface CreateOrderArgs {
  email: string;
  childName?: string;
  world?: string;
  length?: string;
  detailLevel?: string;
  extraMinutes?: number;
  addOns?: string[];
  plotNote?: string;
  /** Optional status applied after creation (e.g. to stage a downstream UI state). */
  status?: OrderStatus;
  /** "webhook" (default) drives handleStripeEvent; "seed" inserts directly. */
  mode?: "webhook" | "seed";
}

export interface CreateOrderResult {
  orderId: string;
  owner: string;
  status: string;
  sessionId: string;
  paymentIntentId: string;
}

function normalizeOwner(owner: unknown): string {
  return typeof owner === "object" && owner !== null
    ? String((owner as { id: string }).id)
    : String(owner);
}

export async function createOrder(args: CreateOrderArgs): Promise<CreateOrderResult> {
  const email = args.email.trim().toLowerCase();
  const stamp = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
  const sessionId = `cs_agent_${stamp}`;
  const paymentIntentId = `pi_agent_${stamp}`;
  const payload = await getPayloadClient();

  if (args.mode === "seed") {
    const user = await seedCustomer(email);
    const order = await seedOrder(user.id, args.status ?? "paid", args.childName ?? "Ada");
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { stripePaymentIntentId: paymentIntentId },
      overrideAccess: true,
    });
    return {
      orderId: String(order.id),
      owner: String(user.id),
      status: String(order.status),
      sessionId: String(order.stripeSessionId),
      paymentIntentId,
    };
  }

  await handleStripeEvent(
    buildCompletedSessionEvent({
      email,
      sessionId,
      paymentIntentId,
      metadata: {
        childName: args.childName ?? "",
        world: args.world ?? "space",
        length: args.length ?? "short",
        detailLevel: args.detailLevel ?? "detailed",
        extraMinutes: args.extraMinutes != null ? String(args.extraMinutes) : undefined,
        addOns: args.addOns ? args.addOns.join(",") : undefined,
        plotNote: args.plotNote,
      },
    }),
  );

  const found = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });
  const order = found.docs[0];
  if (!order) throw new Error("create_order: order was not created by handleStripeEvent");

  if (args.status && args.status !== order.status) {
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { status: args.status },
      overrideAccess: true,
    });
  }

  return {
    orderId: String(order.id),
    owner: normalizeOwner(order.owner),
    status: String(args.status ?? order.status),
    sessionId,
    paymentIntentId,
  };
}

export async function getOrder(orderId: string) {
  const payload = await getPayloadClient();
  return payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 1,
    overrideAccess: true,
    disableErrors: true,
  });
}

export async function listOrders(args: { email?: string }) {
  const payload = await getPayloadClient();
  if (args.email) {
    const users = await payload.find({
      collection: "users",
      where: { email: { equals: args.email.trim().toLowerCase() } },
      limit: 1,
      overrideAccess: true,
    });
    if (users.totalDocs === 0) return [];
    return getOrdersForOwner(String(users.docs[0].id));
  }
  const result = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    sort: "-createdAt",
    limit: 50,
  });
  return result.docs;
}

export function getCheckoutIntent(input: CheckoutInput) {
  const params = buildCheckoutSessionParams(input);
  const amountCents = computeTotalCents({
    length: input.length,
    detail: input.detail,
    extraMinutes: input.extraMinutes,
    addOns: input.addOns,
  });
  return {
    amountCents,
    successUrl: params.success_url,
    cancelUrl: params.cancel_url,
    metadata: params.metadata,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/orders.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/agent-mcp/tools/orders.ts tests/agent-mcp/orders.test.ts
git commit -m "feat(agent-mcp): orders tools — create_order/get_order/list_orders/get_checkout_intent"
```

---

## Task 5: Customer tools — photos / approve / revise / note

**Files:**
- Create: `tools/agent-mcp/tools/customer.ts`
- Test: `tests/agent-mcp/customer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/customer.test.ts`:
```ts
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import {
  addCustomerNote,
  approveProofTool,
  requestProofChangeTool,
  uploadPhotos,
} from "@/tools/agent-mcp/tools/customer";

const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test("uploadPhotos reads files from disk and attaches them", async () => {
  const { orderId } = await createOrder({ email: `cust-${Date.now()}@x.io`, length: "short", status: "awaiting_assets" });
  const dir = mkdtempSync(join(tmpdir(), "agent-mcp-"));
  const file = join(dir, "child.png");
  writeFileSync(file, PNG_1x1);

  const res = await uploadPhotos(orderId, [file]);
  expect(res.added).toBe(1);

  const order = await getOrder(orderId);
  expect(order?.status).toBe("in_production");
});

test("approve / revise / note drive customer-side state", async () => {
  const { orderId } = await createOrder({ email: `cust2-${Date.now()}@x.io`, length: "short", status: "proof_ready" });

  await requestProofChangeTool(orderId, "Make it brighter.");
  expect((await getOrder(orderId))?.status).toBe("revisions");

  await approveProofTool(orderId);
  expect((await getOrder(orderId))?.status).toBe("approved");

  const noteRes = await addCustomerNote(orderId, "Thank you!");
  expect(noteRes.ok).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/customer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the customer tools**

Create `tools/agent-mcp/tools/customer.ts`:
```ts
import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import { appendCustomerNote } from "@/lib/order-actions";
import {
  approveProofCore,
  requestProofChangeCore,
  uploadOrderAssetsCore,
  type UploadFileSpec,
} from "@/lib/order-action-cores";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Read image files from disk and attach them to an order's assets. */
export async function uploadPhotos(orderId: string, filePaths: string[]) {
  const files: UploadFileSpec[] = [];
  for (const path of filePaths) {
    const data = await readFile(path);
    const mimetype = MIME_BY_EXT[extname(path).toLowerCase()] ?? "application/octet-stream";
    files.push({ data, name: basename(path), mimetype, size: data.byteLength });
  }
  return uploadOrderAssetsCore(orderId, files);
}

export async function approveProofTool(orderId: string): Promise<{ ok: true }> {
  await approveProofCore(orderId);
  return { ok: true };
}

export async function requestProofChangeTool(orderId: string, note: string): Promise<{ ok: true }> {
  await requestProofChangeCore(orderId, note);
  return { ok: true };
}

export async function addCustomerNote(orderId: string, message: string) {
  return appendCustomerNote(orderId, message);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/customer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/agent-mcp/tools/customer.ts tests/agent-mcp/customer.test.ts
git commit -m "feat(agent-mcp): customer tools — upload_photos/approve_proof/request_proof_change/add_customer_note"
```

---

## Task 6: Studio tools — status / attach proof / attach final / promised-by

**Files:**
- Create: `tools/agent-mcp/tools/studio.ts`
- Test: `tests/agent-mcp/studio.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/studio.test.ts`:
```ts
import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { attachFinalVideo, attachProof, setPromisedBy, setStatus } from "@/tools/agent-mcp/tools/studio";

test("set_status to proof_ready is blocked until a proof is attached", async () => {
  const { orderId } = await createOrder({ email: `studio-${Date.now()}@x.io`, length: "short", status: "in_production" });

  const blocked = await setStatus(orderId, "proof_ready");
  expect(blocked.ok).toBe(false);

  const proof = await attachProof(orderId);
  expect(proof.ok).toBe(true);

  const ok = await setStatus(orderId, "proof_ready");
  expect(ok.ok).toBe(true);
  expect((await getOrder(orderId))?.status).toBe("proof_ready");
});

test("attach_final_video enables delivered; set_promised_by stores a date", async () => {
  const { orderId } = await createOrder({ email: `studio2-${Date.now()}@x.io`, length: "short", status: "approved" });

  expect((await setStatus(orderId, "delivered")).ok).toBe(false);
  expect((await attachFinalVideo(orderId)).ok).toBe(true);
  expect((await setStatus(orderId, "delivered")).ok).toBe(true);

  const iso = new Date("2026-07-01T00:00:00.000Z").toISOString();
  expect((await setPromisedBy(orderId, iso)).ok).toBe(true);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/studio.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the studio tools**

Create `tools/agent-mcp/tools/studio.ts`:
```ts
import type { OrderStatus } from "@/lib/order-stages";
import {
  applyOrderStatusCore,
  applyPromisedByCore,
  attachVideoCore,
} from "@/lib/studio-order-mutations";

export async function setStatus(orderId: string, status: OrderStatus) {
  return applyOrderStatusCore(orderId, status);
}

export async function setPromisedBy(orderId: string, iso: string | null) {
  return applyPromisedByCore(orderId, iso);
}

/**
 * Attach a synthetic proof video (metadata-only). The bytes need not exist in
 * Blob for state/UI testing — only playback would 404. Pass a real test-blob
 * pathname when you need the video proxy to resolve.
 */
export async function attachProof(orderId: string, pathname = `agent-proof-${Date.now()}.mp4`) {
  return attachVideoCore({ orderId, kind: "proof", blob: { pathname, contentType: "video/mp4", size: 1024 } });
}

export async function attachFinalVideo(orderId: string, pathname = `agent-final-${Date.now()}.mp4`) {
  return attachVideoCore({ orderId, kind: "finalVideo", blob: { pathname, contentType: "video/mp4", size: 1024 } });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/studio.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/agent-mcp/tools/studio.ts tests/agent-mcp/studio.test.ts
git commit -m "feat(agent-mcp): studio tools — set_status/attach_proof/attach_final_video/set_promised_by"
```

---

## Task 7: Payment tools — refund / dispute

**Files:**
- Create: `tools/agent-mcp/tools/payments.ts`
- Test: `tests/agent-mcp/payments.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/payments.test.ts`:
```ts
import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { simulateDispute, simulateRefund } from "@/tools/agent-mcp/tools/payments";

test("simulate_refund moves the order to refunded", async () => {
  const order = await createOrder({ email: `pay-${Date.now()}@x.io`, length: "short" });
  await simulateRefund(order.paymentIntentId);
  expect((await getOrder(order.orderId))?.status).toBe("refunded");
});

test("simulate_dispute moves the order to cancelled", async () => {
  const order = await createOrder({ email: `pay2-${Date.now()}@x.io`, length: "short" });
  await simulateDispute(order.paymentIntentId);
  expect((await getOrder(order.orderId))?.status).toBe("cancelled");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/payments.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the payment tools**

Create `tools/agent-mcp/tools/payments.ts`:
```ts
import { handleStripeEvent } from "@/app/api/stripe/webhook/route";

import { buildDisputeEvent, buildRefundEvent } from "../lib/synthetic-stripe";

export async function simulateRefund(paymentIntentId: string): Promise<{ ok: true }> {
  await handleStripeEvent(buildRefundEvent(paymentIntentId));
  return { ok: true };
}

export async function simulateDispute(paymentIntentId: string): Promise<{ ok: true }> {
  await handleStripeEvent(buildDisputeEvent(paymentIntentId));
  return { ok: true };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/payments.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/agent-mcp/tools/payments.ts tests/agent-mcp/payments.test.ts
git commit -m "feat(agent-mcp): payment tools — simulate_refund/simulate_dispute"
```

---

## Task 8: Auth + maintenance tools — login link / reset

**Files:**
- Create: `tools/agent-mcp/tools/auth.ts`, `tools/agent-mcp/tools/maintenance.ts`
- Test: `tests/agent-mcp/auth-maintenance.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/agent-mcp/auth-maintenance.test.ts`:
```ts
import { expect, test } from "vitest";

import { createOrder, getOrder } from "@/tools/agent-mcp/tools/orders";
import { mintLoginLink } from "@/tools/agent-mcp/tools/auth";
import { resetTestDb } from "@/tools/agent-mcp/tools/maintenance";

test("mintLoginLink returns a verify URL for the customer", async () => {
  const email = `auth-${Date.now()}@x.io`;
  await createOrder({ email, length: "short" });
  const url = await mintLoginLink(email, "http://localhost:3100");
  expect(url).toContain("token=");
});

test("resetTestDb deletes harness-created orders", async () => {
  const { orderId } = await createOrder({ email: `reset-${Date.now()}@x.io`, length: "short" });
  const removed = await resetTestDb();
  expect(removed.orders).toBeGreaterThanOrEqual(1);
  expect(await getOrder(orderId)).toBeFalsy();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/auth-maintenance.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the auth tool**

Create `tools/agent-mcp/tools/auth.ts`:
```ts
import { createOrderTrackingLink } from "@/lib/order-tracking-link";

/** Mint a magic sign-in link so Playwright can authenticate as the customer. */
export async function mintLoginLink(
  email: string,
  baseUrl: string = process.env.BETTER_AUTH_URL ?? "http://localhost:3100",
  callbackURL = "/app",
): Promise<string> {
  return createOrderTrackingLink({ email: email.trim().toLowerCase(), baseUrl, callbackURL });
}
```

- [ ] **Step 4: Implement the maintenance tool**

Create `tools/agent-mcp/tools/maintenance.ts`:
```ts
import { getPayloadClient } from "@/lib/payload";

/**
 * Prune harness-created data so runs are isolated. Targets orders whose
 * stripeSessionId marks them harness-created (cs_agent_ / cs_seed_). Test-branch
 * only (the boot guard guarantees this).
 */
export async function resetTestDb(): Promise<{ orders: number }> {
  const payload = await getPayloadClient();
  const result = await payload.delete({
    collection: "orders",
    where: {
      or: [
        { stripeSessionId: { contains: "cs_agent_" } },
        { stripeSessionId: { contains: "cs_seed_" } },
      ],
    },
    overrideAccess: true,
  });
  const docs = Array.isArray(result.docs) ? result.docs.length : 0;
  return { orders: docs };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/auth-maintenance.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add tools/agent-mcp/tools/auth.ts tools/agent-mcp/tools/maintenance.ts tests/agent-mcp/auth-maintenance.test.ts
git commit -m "feat(agent-mcp): auth + maintenance tools — mint_login_link/reset_test_db"
```

---

## Task 9: MCP server wiring (HTTP transport) + registration + boot smoke test

**Files:**
- Create: `tools/agent-mcp/bootstrap-env.ts`, `tools/agent-mcp/register.ts`, `tools/agent-mcp/server.ts`, `tools/agent-mcp/README.md`, `.mcp.json`
- Test: `tests/agent-mcp/register.test.ts`

Notes: env MUST load before any module that imports Payload (`payload.config.ts` reads
`process.env.DATABASE_URI` at module eval). `bootstrap-env.ts` is imported FIRST (its
side effects run before the dynamic import of `register.ts`, which pulls in the tools and
Payload). The server uses the **HTTP transport** because Payload logs to stdout, which
would corrupt a stdio MCP. All server-side logging uses `console.error` (stderr).

- [ ] **Step 1: Create the env bootstrap (side-effect module)**

Create `tools/agent-mcp/bootstrap-env.ts`:
```ts
// Side-effect import — MUST run before any module that imports Payload, because
// payload.config.ts reads process.env at module eval. Keep this import FIRST in
// server.ts and never import Payload/tools from here.
import { loadAgentEnv } from "./env";
import { assertTestDatabase } from "./guard";

loadAgentEnv();
assertTestDatabase();
```

- [ ] **Step 2: Write the failing registration test**

Create `tests/agent-mcp/register.test.ts`:
```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { expect, test } from "vitest";

import { registerTools } from "@/tools/agent-mcp/register";

test("registerTools wires every lifecycle tool onto the server", () => {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  const names = registerTools(server);
  for (const expected of [
    "create_order", "get_order", "list_orders", "get_checkout_intent",
    "upload_photos", "approve_proof", "request_proof_change", "add_customer_note",
    "set_status", "attach_proof", "attach_final_video", "set_promised_by",
    "simulate_refund", "simulate_dispute",
    "mint_login_link", "reset_test_db",
  ]) {
    expect(names).toContain(expected);
  }
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- tests/agent-mcp/register.test.ts`
Expected: FAIL — `Cannot find module '@/tools/agent-mcp/register'`.

- [ ] **Step 4: Implement the tool registration**

Create `tools/agent-mcp/register.ts`:
```ts
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  createOrder, getCheckoutIntent, getOrder, listOrders,
} from "./tools/orders";
import {
  addCustomerNote, approveProofTool, requestProofChangeTool, uploadPhotos,
} from "./tools/customer";
import {
  attachFinalVideo, attachProof, setPromisedBy, setStatus,
} from "./tools/studio";
import { simulateDispute, simulateRefund } from "./tools/payments";
import { mintLoginLink } from "./tools/auth";
import { resetTestDb } from "./tools/maintenance";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

const STATUS = z.enum([
  "paid", "awaiting_assets", "in_production", "proof_ready",
  "revisions", "approved", "delivered", "refunded", "cancelled",
]);

/** Registers every tool; returns the list of registered names (for tests). */
export function registerTools(server: McpServer): string[] {
  server.tool(
    "create_order",
    {
      email: z.string(),
      childName: z.string().optional(),
      world: z.string().optional(),
      length: z.string().optional(),
      detailLevel: z.string().optional(),
      extraMinutes: z.number().optional(),
      addOns: z.array(z.string()).optional(),
      plotNote: z.string().optional(),
      status: STATUS.optional(),
      mode: z.enum(["webhook", "seed"]).optional(),
    },
    async (args) => json(await createOrder(args)),
  );

  server.tool("get_order", { orderId: z.string() }, async ({ orderId }) => json(await getOrder(orderId)));
  server.tool("list_orders", { email: z.string().optional() }, async ({ email }) => json(await listOrders({ email })));
  server.tool(
    "get_checkout_intent",
    {
      childName: z.string(),
      world: z.string(),
      length: z.string(),
      detail: z.string(),
      extraMinutes: z.number(),
      addOns: z.array(z.string()),
      plotNote: z.string().optional(),
      email: z.string().optional(),
    },
    async (args) => json(getCheckoutIntent(args)),
  );

  server.tool(
    "upload_photos",
    { orderId: z.string(), filePaths: z.array(z.string()) },
    async ({ orderId, filePaths }) => json(await uploadPhotos(orderId, filePaths)),
  );
  server.tool("approve_proof", { orderId: z.string() }, async ({ orderId }) => json(await approveProofTool(orderId)));
  server.tool(
    "request_proof_change",
    { orderId: z.string(), note: z.string() },
    async ({ orderId, note }) => json(await requestProofChangeTool(orderId, note)),
  );
  server.tool(
    "add_customer_note",
    { orderId: z.string(), message: z.string() },
    async ({ orderId, message }) => json(await addCustomerNote(orderId, message)),
  );

  server.tool("set_status", { orderId: z.string(), status: STATUS }, async ({ orderId, status }) => json(await setStatus(orderId, status)));
  server.tool("attach_proof", { orderId: z.string(), pathname: z.string().optional() }, async ({ orderId, pathname }) => json(await attachProof(orderId, pathname)));
  server.tool("attach_final_video", { orderId: z.string(), pathname: z.string().optional() }, async ({ orderId, pathname }) => json(await attachFinalVideo(orderId, pathname)));
  server.tool("set_promised_by", { orderId: z.string(), iso: z.string().nullable() }, async ({ orderId, iso }) => json(await setPromisedBy(orderId, iso)));

  server.tool("simulate_refund", { paymentIntentId: z.string() }, async ({ paymentIntentId }) => json(await simulateRefund(paymentIntentId)));
  server.tool("simulate_dispute", { paymentIntentId: z.string() }, async ({ paymentIntentId }) => json(await simulateDispute(paymentIntentId)));

  server.tool(
    "mint_login_link",
    { email: z.string(), baseUrl: z.string().optional(), callbackURL: z.string().optional() },
    async ({ email, baseUrl, callbackURL }) => json(await mintLoginLink(email, baseUrl, callbackURL)),
  );
  server.tool("reset_test_db", {}, async () => json(await resetTestDb()));

  return [
    "create_order", "get_order", "list_orders", "get_checkout_intent",
    "upload_photos", "approve_proof", "request_proof_change", "add_customer_note",
    "set_status", "attach_proof", "attach_final_video", "set_promised_by",
    "simulate_refund", "simulate_dispute",
    "mint_login_link", "reset_test_db",
  ];
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- tests/agent-mcp/register.test.ts`
Expected: PASS (1 test).

- [ ] **Step 6: Implement the server entry (HTTP transport)**

Create `tools/agent-mcp/server.ts`:
```ts
// Env + safety guard MUST run before anything imports Payload.
import "./bootstrap-env";

import { createServer } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

async function main(): Promise<void> {
  // Dynamic import: pulls in the tools + Payload AFTER env is loaded.
  const { registerTools } = await import("./register");

  const server = new McpServer({ name: "yours-fairy-tale-agent", version: "0.1.0" });
  const names = registerTools(server);

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  const port = Number(process.env.AGENT_MCP_PORT ?? 39199);
  const http = createServer((req, res) => {
    if (req.url?.startsWith("/mcp")) {
      void transport.handleRequest(req, res);
      return;
    }
    res.writeHead(404).end();
  });
  http.listen(port, () => {
    // stderr only — stdout is reserved (Payload logs there; MCP HTTP body is separate).
    console.error(`[agent-mcp] listening on http://localhost:${port}/mcp — ${names.length} tools`);
  });
}

main().catch((err) => {
  console.error("[agent-mcp] failed to start:", err);
  process.exit(1);
});
```

- [ ] **Step 7: Create the `.mcp.json` registration**

Create `.mcp.json` at the repo root:
```json
{
  "mcpServers": {
    "yours-fairy-tale-agent": {
      "type": "http",
      "url": "http://localhost:39199/mcp"
    }
  }
}
```

- [ ] **Step 8: Write the README**

Create `tools/agent-mcp/README.md`:
```markdown
# Agent order-tooling MCP

Internal debugging harness. Lets agents create/drive/inspect the full order
lifecycle against the **Neon test branch**, composed with the Playwright MCP for UI.

## Safety
- Boots ONLY when `.env.test` exists AND `AGENT_MCP_CONFIRM_TEST_DB=1` is set in it.
- Refuses to run when `VERCEL_ENV=production`.
- Never touches prod; never hits real Stripe (synthesized `livemode:false` events).

## Run
1. Add `AGENT_MCP_CONFIRM_TEST_DB=1` to `.env.test`.
2. Start the app's test server (so Playwright + magic links work): `npm run build && npx next start -p 3100`.
3. Start the MCP server: `npm run agent:mcp` (listens on http://localhost:39199/mcp).
4. The agent connects via `.mcp.json` (HTTP transport).

## Tools
create_order, get_order, list_orders, get_checkout_intent, upload_photos,
approve_proof, request_proof_change, add_customer_note, set_status, attach_proof,
attach_final_video, set_promised_by, simulate_refund, simulate_dispute,
mint_login_link, reset_test_db.

HTTP transport is used (not stdio) because Payload logs to stdout.
```

- [ ] **Step 9: Manual boot check**

Run (with `AGENT_MCP_CONFIRM_TEST_DB=1` in `.env.test`):
```bash
timeout -s KILL 25 npm run agent:mcp 2>&1 | head -5 || true
```
Expected: a stderr line `[agent-mcp] listening on http://localhost:39199/mcp — 16 tools` (then killed by timeout). If it instead prints the guard error, confirm `.env.test` + the flag.

- [ ] **Step 10: Commit**

```bash
git add tools/agent-mcp/bootstrap-env.ts tools/agent-mcp/register.ts tools/agent-mcp/server.ts tools/agent-mcp/README.md tests/agent-mcp/register.test.ts .mcp.json
git commit -m "feat(agent-mcp): MCP server (HTTP transport) + tool registration + .mcp.json"
```

---

## Task 10: Playwright Layer-B — the end-to-end agent loop (the living example)

**Files:**
- Create: `e2e/agent-loop.spec.ts`

This spec exercises the harness the way an agent would: materialize an order, mint a login
link, land on the real `success_url`, and assert the dashboard renders the order. It is
also where the "post-success confirmation" gap is observable (it asserts the order is
present; a follow-up will assert an explicit confirmation message once that's built).

- [ ] **Step 1: Write the spec**

Create `e2e/agent-loop.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

import { createOrder } from "../tools/agent-mcp/tools/orders";
import { mintLoginLink } from "../tools/agent-mcp/tools/auth";

// Layer B: DB-backed against the Neon test branch. Opt out of the shared
// authed storageState — this spec mints its own session.
test.use({ storageState: { cookies: [], origins: [] } });

test("@layerB agent loop: create_order -> mint_login_link -> success landing shows the order", async ({ page, baseURL }) => {
  const email = `agent-loop-${Date.now()}@x.io`;
  const { sessionId } = await createOrder({ email, childName: "Ada", world: "space", length: "short", detailLevel: "detailed" });

  const link = await mintLoginLink(email, baseURL ?? "http://localhost:3100");

  // Follow the magic link (authenticates), then land on the real success_url.
  await page.goto(link);
  await page.goto(`/app?session=${encodeURIComponent(sessionId)}`);

  // The order is visible on the dashboard (status "paid" → "Awaiting assets" stage copy).
  await expect(page.getByText(/Ada/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the spec**

Run: `npm run test:e2e -- e2e/agent-loop.spec.ts`
Expected: PASS. (Playwright builds + starts the app on :3100 per `playwright.config.ts`; the test branch is loaded via the e2e env.) If the magic-link interstitial requires a confirm click, add `await page.getByRole("button", { name: /confirm|sign in/i }).click();` after the first `goto` — match the existing `e2e/fixtures/auth.ts` flow.

- [ ] **Step 3: Commit**

```bash
git add e2e/agent-loop.spec.ts
git commit -m "test(e2e): Layer B agent loop — create_order + mint_login_link + success landing"
```

---

## Task 11: Mind maintenance

**Files:**
- Create: `fairy-tale-mind/map/zones/agent-tooling.md`
- Modify: `fairy-tale-mind/map/zones/testing.md` (re-stamp), `fairy-tale-mind/map/index.md` (regenerated)
- Create: `fairy-tale-mind/map/decisions/2026-06-14-agent-mcp-synthesized-stripe.md`, `fairy-tale-mind/map/decisions/2026-06-14-agent-mcp-vite-node-http-transport.md`

- [ ] **Step 1: Read the navigating-fairy-tale skill + an existing zone card for the exact frontmatter shape**

Run: review `.claude/skills/navigating-fairy-tale/SKILL.md` and `fairy-tale-mind/map/zones/testing.md` to copy the zone-card frontmatter/section conventions (sources, invariants, verifiedAt).

- [ ] **Step 2: Write the `agent-tooling` zone card**

Create `fairy-tale-mind/map/zones/agent-tooling.md` describing: the MCP server (`tools/agent-mcp/`), the tool surface, the headless-`*Core` wrapping pattern, the `vite-node` loader + HTTP transport rationale, the compose-with-Playwright pattern, and the **safety invariant** (`.env.test` + `AGENT_MCP_CONFIRM_TEST_DB=1`, refuses prod). List `sources` to the real files (`tools/agent-mcp/*`, `lib/order-action-cores.ts`) and an invariant: "The harness must refuse to boot against any DB but the Neon test branch."

- [ ] **Step 3: Re-stamp the `testing` zone card**

Update `fairy-tale-mind/map/zones/testing.md`: add the agent harness (vitest `tests/agent-mcp/*`, the `e2e/agent-loop.spec.ts` Layer-B loop) to its summary/sources and re-stamp `verifiedAt` to the current HEAD.

- [ ] **Step 4: Write the decision records**

Create `fairy-tale-mind/map/decisions/2026-06-14-agent-mcp-synthesized-stripe.md` (why the harness synthesizes the Stripe boundary via `handleStripeEvent` rather than a real test-mode loop) and `fairy-tale-mind/map/decisions/2026-06-14-agent-mcp-vite-node-http-transport.md` (why `vite-node` is the loader and HTTP — not stdio — is the transport: Payload's ESM config + stdout logging).

- [ ] **Step 5: Regenerate the Mind index**

Run: `npm run mind`
Expected: `fairy-tale-mind/map/index.md` regenerates with the new `agent-tooling` zone and an updated count; no verification errors for the new card.

- [ ] **Step 6: Commit**

```bash
git add fairy-tale-mind/
git commit -m "docs(mind): agent-tooling zone, testing re-stamp, decision records (agent order-tooling MCP)"
```

---

## Final verification

- [ ] **Run the whole unit suite:** `npm test` — Expected: all green (existing + `tests/agent-mcp/*`).
- [ ] **Run the e2e suite:** `npm run test:e2e` — Expected: all green incl. `e2e/agent-loop.spec.ts`.
- [ ] **Typecheck:** `npx tsc --noEmit` — Expected: no errors.
- [ ] **Boot the server** (`npm run agent:mcp`) and confirm the 16-tool stderr line.

---

## Self-review notes (author)

- **Spec coverage:** every tool in the spec's surface maps to a task (orders T4, customer T5, studio T6, payments T7, auth+utility T8); the enabling refactor is T2; safety invariant is T1+guard test; the two example-bug repros are T10 (success landing) + `get_checkout_intent`/Playwright (cancel URL); Mind impact is T11. Stripe-synthesized and vite-node/HTTP decisions are recorded (T11) and implemented (T3/T9).
- **Type consistency:** `UploadFileSpec`/`UploadResult` defined in `lib/order-action-cores.ts` and imported everywhere; `CreateOrderResult.paymentIntentId` is the same value `simulate_refund`/`simulate_dispute` consume; status enum (`STATUS`) matches `OrderStatus` / `ALL_STATUSES`.
- **Known follow-ups (out of scope, per spec):** fixing the cancel/form-persistence and post-success confirmation flows; an optional move of `appendCustomerNote` into the cores module for full `"use server"` hygiene.
- **Risk to watch during execution:** `vite-node` long-lived process + Payload boot (Task 9 Step 9 is the early check). If `vite-node` cannot keep Payload alive as a server, fall back to a per-call vitest-runner for the tools (slower) — the handlers are unchanged either way since they're tested under vitest.
