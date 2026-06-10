# The Studio — Staff Order-Management Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A staff-only `/studio` section (dashboard with revenue totals + needs-attention queue, full per-order workstation with status workflow, browser-to-Blob video uploads), a customer-facing delivery-promise countdown, the builder mascot in three places, and a fix for the broken customer proof playback.

**Architecture:** New `app/studio/` route tree gated by the existing Payload `admins` auth (`payload.auth({ headers })` in a layout; branded sign-in posting to Payload's REST `/api/admins/login`). Pure, testable cores in `lib/` (delivery math, workflow rules, revenue aggregation) with thin server components on top, following the `lib/customer-data.ts` + `lib/order-actions.ts` pattern. Large video uploads go browser → Vercel Blob via `@vercel/blob/client` tokens minted by an admin-gated route, then a server action attaches the blob as a metadata-only `media` doc (`filesRequiredOnCreate: false`).

**Tech Stack:** Next.js 16 App Router, Payload v3.85 (Local API, Postgres/Neon, uuid PKs), `@vercel/blob` 2.4.0, `@payloadcms/storage-vercel-blob` (pass-through + `clientUploads`), Tailwind v4 brand tokens, vitest (DB-backed) + Playwright Layer B.

**Spec:** `fairy-tale-mind/specs/2026-06-10-studio-panel-design.md` (including the proof-playback addendum).

**Verified against vendored source (do not re-derive):**
- `payload.auth({ headers })` → `{ user: TypedUser | null }`; `user.collection === "admins"` for staff; foreign/invalid cookies → `user: null` (node_modules/payload/dist/index.d.ts:248, auth/operations/auth.d.ts:3-15, auth/strategies/jwt.js:46-111).
- `POST /api/admins/login` body `{ email, password }` sets the `payload-token` cookie (payload/dist/auth/endpoints/index.js:32-34). Logout: `POST /api/admins/logout`.
- `upload.filesRequiredOnCreate?: boolean` exists; `false` allows `payload.create({ collection: "media", data: { filename, mimeType, filesize } })` with no file (payload/dist/uploads/types.d.ts:206-209, collections/operations/create.js).
- `@payloadcms/storage-vercel-blob` supports `clientUploads` (dist/index.d.ts:35-36); blob key == sanitized filename (no prefix configured, `addRandomSuffix` default false).
- `@vercel/blob/client`: `upload(pathname, file, { access, handleUploadUrl, onUploadProgress })` and `handleUpload({ body, request, onBeforeGenerateToken, onUploadCompleted })`. **`onUploadCompleted` does NOT fire on localhost** — that's why the client calls the attach action itself.
- Brand voice: `.claude/skills/brand-voice/SKILL.md` — sentence case, no em-dashes in customer copy, calm errors. Section dividers: not needed (studio pages are single-color cream).

**House conventions that apply everywhere below:** brand tokens only (no hex), `shadow-comic*` for shadows, `font-[family-name:var(--font-fredoka)]` or `style={{ fontFamily: "var(--font-fredoka)" }}` for display text, every CTA leads somewhere real, internal links use `next/link`. DB-backed tests run with `npm test` (vitest, `.env.test` fallback `.env`); the sandbox may have no DB — in that case run the non-DB subset and note DB tests as CI-deferred, same as the launch-hardening branch did.

---

### Task 0: Mascot assets

The 9.8MB original GIF sits untracked at the worktree root (`builder-mascot-original.gif`, also `/tmp/fairy-assets/builder.gif`). Commit only compressed derivatives.

**Files:**
- Create: `public/mascot/builder-360.webp`, `public/mascot/builder-240.webp`, `public/mascot/builder-static.png`
- Create: `assets/builder-mascot-original.gif` (moved from worktree root; gitignored)
- Modify: `.gitignore`

- [ ] **Step 1: Move the original + generate derivatives**

```bash
mkdir -p public/mascot assets
mv builder-mascot-original.gif assets/builder-mascot-original.gif
ffmpeg -hide_banner -loglevel error -i assets/builder-mascot-original.gif \
  -vf "crop=in_h*0.62:in_h:(in_w-in_h*0.62)/2:0,scale=-2:360:flags=lanczos,fps=15" \
  -c:v libwebp -lossless 0 -q:v 75 -loop 0 -an public/mascot/builder-360.webp
ffmpeg -hide_banner -loglevel error -i assets/builder-mascot-original.gif \
  -vf "crop=in_h*0.62:in_h:(in_w-in_h*0.62)/2:0,scale=-2:240:flags=lanczos,fps=12" \
  -c:v libwebp -lossless 0 -q:v 60 -loop 0 -an public/mascot/builder-240.webp
ffmpeg -hide_banner -loglevel error -i assets/builder-mascot-original.gif \
  -vf "crop=in_h*0.62:in_h:(in_w-in_h*0.62)/2:0,scale=-2:360:flags=lanczos" \
  -frames:v 1 public/mascot/builder-static.png
ls -lh public/mascot/
```

Expected: builder-360.webp ≈ 1.1M, builder-240.webp ≈ 470K, builder-static.png ≈ 80K (verified in this sandbox).

- [ ] **Step 2: Gitignore the original**

Append to `.gitignore` (under the "misc" section):

```gitignore
# mascot source GIF (9.8MB) — only the compressed public/mascot/* derivatives are committed;
# regeneration recipe lives in fairy-tale-mind/specs/2026-06-10-studio-panel-design.md
/assets/builder-mascot-original.gif
```

- [ ] **Step 3: Verify the original is ignored and derivatives are not**

Run: `git check-ignore assets/builder-mascot-original.gif && git status --short public/mascot/`
Expected: first command prints the path (ignored); status shows three `??` files.

- [ ] **Step 4: Commit**

```bash
git add .gitignore public/mascot/
git commit -m "feat(assets): builder mascot — compressed webp + static fallback"
```

---

### Task 1: Delivery-promise model (`lib/delivery.ts`) — TDD

Pure date math: production-time defaults per film length, the promised date, and the customer countdown state machine.

**Files:**
- Create: `lib/delivery.ts`
- Test: `tests/lib/delivery.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Delivery-promise model tests — pure date math, no DB, no DOM.
 */
import { describe, expect, test } from "vitest";

import {
  PRODUCTION_DAYS,
  promisedByForLength,
  countdownState,
  formatPromisedDate,
} from "@/lib/delivery";

const NOW = new Date("2026-06-10T12:00:00.000Z");

describe("promisedByForLength", () => {
  test("maps each length to its production window", () => {
    expect(PRODUCTION_DAYS).toEqual({ short: 7, medium: 14, long: 21 });
    expect(promisedByForLength("short", NOW)?.toISOString()).toBe(
      "2026-06-17T12:00:00.000Z",
    );
    expect(promisedByForLength("medium", NOW)?.toISOString()).toBe(
      "2026-06-24T12:00:00.000Z",
    );
    expect(promisedByForLength("long", NOW)?.toISOString()).toBe(
      "2026-07-01T12:00:00.000Z",
    );
  });

  test("unknown or missing length yields no promise", () => {
    expect(promisedByForLength(undefined, NOW)).toBeNull();
    expect(promisedByForLength("epic", NOW)).toBeNull();
    expect(promisedByForLength(null, NOW)).toBeNull();
  });
});

describe("countdownState", () => {
  const base = {
    createdAt: "2026-06-06T12:00:00.000Z",
    now: NOW,
  };

  test("hidden without a promise, on terminal statuses, and on delivery", () => {
    expect(
      countdownState({ ...base, status: "in_production", promisedBy: null }),
    ).toEqual({ kind: "hidden" });
    for (const status of ["delivered", "refunded", "cancelled"] as const) {
      expect(
        countdownState({
          ...base,
          status,
          promisedBy: "2026-06-20T12:00:00.000Z",
        }),
      ).toEqual({ kind: "hidden" });
    }
    expect(
      countdownState({ ...base, status: "paid", promisedBy: "not-a-date" }),
    ).toEqual({ kind: "hidden" });
  });

  test("counting: days remaining + fraction of the window elapsed", () => {
    const state = countdownState({
      ...base,
      status: "in_production",
      promisedBy: "2026-06-20T12:00:00.000Z", // 10 days out of a 14-day window
    });
    expect(state.kind).toBe("counting");
    if (state.kind === "counting") {
      expect(state.days).toBe(10);
      // 4 of 14 days elapsed
      expect(state.fractionElapsed).toBeCloseTo(4 / 14, 5);
    }
  });

  test("under a day remaining reads as soon, past the date reads as overdue", () => {
    expect(
      countdownState({
        ...base,
        status: "approved",
        promisedBy: "2026-06-11T06:00:00.000Z", // 18h away
      }).kind,
    ).toBe("soon");
    expect(
      countdownState({
        ...base,
        status: "approved",
        promisedBy: "2026-06-09T12:00:00.000Z", // passed
      }).kind,
    ).toBe("overdue");
  });
});

describe("formatPromisedDate", () => {
  test("renders the calm long form in UTC", () => {
    expect(formatPromisedDate(new Date("2026-06-20T12:00:00.000Z"))).toBe(
      "Saturday, June 20",
    );
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/lib/delivery.test.ts`
Expected: FAIL — cannot resolve `@/lib/delivery`.

- [ ] **Step 3: Implement `lib/delivery.ts`**

```ts
/**
 * Delivery promise — the studio's "promised by" date and the customer
 * countdown, as pure date math (no React, no DB; unit-tested).
 *
 * Defaults are deliberately conservative and live HERE as the single source of
 * truth: the Stripe webhook stamps promisedBy at order creation, and the
 * studio workstation can override per order. Tune PRODUCTION_DAYS as real
 * production pace becomes known.
 */
import type { OrderStatus } from "@/lib/order-stages";

/** Production window per film length, in days from purchase. */
export const PRODUCTION_DAYS: Record<"short" | "medium" | "long", number> = {
  short: 7,
  medium: 14,
  long: 21,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The automatic promise for a new order: purchase time + the length's window.
 * Returns null for unknown/missing lengths — such orders get no automatic
 * promise (the studio can set one by hand).
 */
export function promisedByForLength(length: unknown, from: Date): Date | null {
  if (length !== "short" && length !== "medium" && length !== "long") {
    return null;
  }
  return new Date(from.getTime() + PRODUCTION_DAYS[length] * DAY_MS);
}

/** What the parent's countdown card should show right now. */
export type CountdownState =
  | { kind: "hidden" }
  | { kind: "soon"; promisedBy: Date }
  | { kind: "overdue" }
  | { kind: "counting"; days: number; fractionElapsed: number; promisedBy: Date };

/**
 * Resolve the countdown for an order. Calm by design: never negative numbers
 * (past the date → "overdue" variant), no ticking seconds (days granularity),
 * hidden once delivered and on refunded/cancelled orders.
 */
export function countdownState(args: {
  status: OrderStatus;
  promisedBy?: string | null;
  createdAt?: string | null;
  now: Date;
}): CountdownState {
  const { status, promisedBy, createdAt, now } = args;
  if (!promisedBy) return { kind: "hidden" };
  if (status === "delivered" || status === "refunded" || status === "cancelled") {
    return { kind: "hidden" };
  }

  const target = new Date(promisedBy);
  if (Number.isNaN(target.getTime())) return { kind: "hidden" };

  const remainingMs = target.getTime() - now.getTime();
  if (remainingMs <= 0) return { kind: "overdue" };

  const days = Math.ceil(remainingMs / DAY_MS);
  if (days <= 1) return { kind: "soon", promisedBy: target };

  const created = createdAt ? new Date(createdAt) : null;
  const spanMs =
    created && !Number.isNaN(created.getTime())
      ? target.getTime() - created.getTime()
      : null;
  const fractionElapsed =
    spanMs && spanMs > 0
      ? Math.min(1, Math.max(0, (now.getTime() - (created as Date).getTime()) / spanMs))
      : 0;

  return { kind: "counting", days, fractionElapsed, promisedBy: target };
}

/** "Saturday, June 20" — UTC so server timezone never shifts the promise. */
export function formatPromisedDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/lib/delivery.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/delivery.ts tests/lib/delivery.test.ts
git commit -m "feat(delivery): promise-date model — per-length windows + countdown state"
```

---

### Task 2: Orders schema — `amountTotalCents` + `promisedBy` + migration

**Files:**
- Modify: `collections/Orders.ts` (fields array, after `status`)
- Create: `migrations/20260610_000001_order_amount_promise.ts`
- Modify: `migrations/index.ts`

- [ ] **Step 1: Add the two fields to `collections/Orders.ts`**

Append to the `fields` array (after the `status` field):

```ts
    {
      name: "amountTotalCents",
      type: "number",
      min: 0,
      admin: {
        description:
          "What Stripe actually charged, in cents. Set by the checkout webhook. " +
          "Not recomputed from pricing (prices can change; the charge is history).",
      },
    },
    {
      name: "promisedBy",
      type: "date",
      admin: {
        description:
          "The delivery promise shown to the parent. Auto-set from film length " +
          "at purchase (lib/delivery.ts); the studio may adjust it per order.",
      },
    },
```

- [ ] **Step 2: Write the migration**

Create `migrations/20260610_000001_order_amount_promise.ts` (column shapes mirror the existing orders migrations: number → `numeric`, date → `timestamp(3) with time zone`; idempotent like its siblings):

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Studio panel groundwork: adds the charged amount and the delivery promise
 * to orders.
 *   - orders.amount_total_cents (number → numeric) — set by the Stripe webhook
 *   - orders.promised_by (date → timestamptz)      — auto from film length
 *
 * Idempotent (IF NOT EXISTS), additive only — safe against a dev-pushed schema.
 * VERIFY before merging: with a dev DB available, run
 * `npm run migrate:create -- order_amount_promise` and diff Payload's generated
 * SQL against this file; drizzle naming wins if they differ.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "amount_total_cents" numeric;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promised_by" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "promised_by";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "amount_total_cents";
  `);
}
```

- [ ] **Step 3: Register it in `migrations/index.ts`**

```ts
import * as migration_20260610_000001_order_amount_promise from "./20260610_000001_order_amount_promise";
```

and append to the array:

```ts
  {
    up: migration_20260610_000001_order_amount_promise.up,
    down: migration_20260610_000001_order_amount_promise.down,
    name: "20260610_000001_order_amount_promise",
  },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add collections/Orders.ts migrations/20260610_000001_order_amount_promise.ts migrations/index.ts
git commit -m "feat(orders): amountTotalCents + promisedBy fields with migration"
```

---

### Task 3: Webhook stamps amount + promise; confirmation email gains the expected-by line — TDD

**Files:**
- Modify: `app/api/stripe/webhook/route.ts`
- Test: `tests/stripe/webhook.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `tests/stripe/webhook.test.ts` (helpers `completedEvent` and imports already exist there):

```ts
test("checkout.session.completed stores the charged amount and a delivery promise", async () => {
  const email = `wh-amount-${Date.now()}@example.com`;
  const sessionId = `cs_amount_${Date.now()}`;
  const event = completedEvent(email, sessionId);
  (event.data.object as unknown as Record<string, unknown>).amount_total = 51000;

  await handleStripeEvent(event);

  const payload = await getPayloadClient();
  const orders = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });
  expect(orders.totalDocs).toBe(1);
  const order = orders.docs[0] as Record<string, unknown>;

  expect(order.amountTotalCents).toBe(51000);

  // completedEvent uses length: "short" → promise lands 7 days out from the
  // moment the webhook ran (60s tolerance for test runtime).
  const promised = new Date(order.promisedBy as string).getTime();
  const expected = Date.now() + 7 * 24 * 60 * 60 * 1000;
  expect(Math.abs(promised - expected)).toBeLessThan(60_000);
});

test("checkout.session.completed without amount_total leaves the amount unrecorded", async () => {
  const email = `wh-noamount-${Date.now()}@example.com`;
  const sessionId = `cs_noamount_${Date.now()}`;
  // completedEvent sets no amount_total — exactly the case under test.
  await handleStripeEvent(completedEvent(email, sessionId));

  const payload = await getPayloadClient();
  const orders = await payload.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    limit: 1,
    overrideAccess: true,
  });
  const order = orders.docs[0] as Record<string, unknown>;
  expect(order.amountTotalCents ?? null).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/stripe/webhook.test.ts`
Expected: the two new tests FAIL (`amountTotalCents` undefined / `promisedBy` undefined). DB required — if the sandbox has none, mark this task's test runs as CI-deferred and continue.

- [ ] **Step 3: Implement in `app/api/stripe/webhook/route.ts`**

Add the import:

```ts
import { promisedByForLength, formatPromisedDate } from "@/lib/delivery";
```

In `handleStripeEvent`, just before the `payload.create({ collection: "orders", ... })` call, compute:

```ts
  // What Stripe actually charged (cents). Stored verbatim — the studio
  // dashboard's revenue numbers come from here, never from pricing math.
  const amountTotalCents =
    typeof session.amount_total === "number" ? session.amount_total : undefined;

  // The delivery promise: purchase time + the film length's production window.
  // No length recorded → no automatic promise (studio can set one by hand).
  const promisedBy = promisedByForLength(length, new Date());
```

and extend the create `data`:

```ts
      amountTotalCents,
      promisedBy: promisedBy ? promisedBy.toISOString() : undefined,
```

Then thread the promise into the confirmation email. Change the call site:

```ts
      html: buildOrderConfirmationEmail({
        email,
        childName: childName ?? null,
        trackUrl,
        promisedBy,
      }),
```

and update `buildOrderConfirmationEmail`:

```ts
function buildOrderConfirmationEmail({
  email,
  childName,
  trackUrl,
  promisedBy,
}: {
  email: string;
  childName: string | null;
  trackUrl: string;
  promisedBy: Date | null;
}): string {
  const firstLine = childName
    ? `We have received your order and ${childName}'s video is now in production.`
    : "We have received your order and the video is now in production.";

  const paragraphs = [
    firstLine,
    "We will email you the moment your preview is ready to watch.",
  ];
  if (promisedBy) {
    paragraphs.push(
      `We expect it to be ready by ${formatPromisedDate(promisedBy)}.`,
    );
  }
  paragraphs.push(
    `Use the button below to track your video's progress any time. It signs you in with this email address (${email}).`,
  );

  return renderBrandedEmail({
    preheader: "Your order is confirmed.",
    heading: "Your order is confirmed",
    accent: "yellow",
    bodyHtml: emailParagraphs(paragraphs),
    cta: { label: "Track your order", href: trackUrl },
  });
}
```

- [ ] **Step 4: Run the full stripe test file**

Run: `npx vitest run tests/stripe/`
Expected: PASS, including all pre-existing tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/stripe/webhook/route.ts tests/stripe/webhook.test.ts
git commit -m "feat(webhook): persist charged amount + delivery promise; email the expected-by date"
```

---

### Task 4: Studio auth bridge (`lib/studio-auth.ts`) — TDD

The single doorway for "is this request a signed-in staff member": resolves the `payload-token` cookie via the Local API and requires the `admins` collection.

**Files:**
- Create: `lib/studio-auth.ts`
- Test: `tests/studio/auth.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Studio auth bridge tests — DB-backed: creates a real admin, logs in via the
 * Local API to mint a real payload-token, and resolves it through
 * getStudioUserFromHeaders. Customer (Better Auth) cookies and garbage tokens
 * must resolve to null — the studio gate trusts admins ONLY.
 */
import { describe, expect, test } from "vitest";

import { getStudioUserFromHeaders } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";

async function seedAdminWithToken() {
  const payload = await getPayloadClient();
  const email = `studio-auth-${Date.now()}@example.com`;
  const password = `pw-${Date.now()}-secret`;
  await payload.create({
    collection: "admins",
    data: { email, password, name: "Studio Test Admin" },
    overrideAccess: true,
  });
  const login = await payload.login({
    collection: "admins",
    data: { email, password },
  });
  if (!login.token) throw new Error("login returned no token");
  return { email, token: login.token };
}

describe("getStudioUserFromHeaders", () => {
  test("a real admins token resolves to the staff user", async () => {
    const { email, token } = await seedAdminWithToken();
    const user = await getStudioUserFromHeaders(
      new Headers({ cookie: `payload-token=${token}` }),
    );
    expect(user).not.toBeNull();
    expect(user?.email).toBe(email);
  });

  test("no cookie → null", async () => {
    expect(await getStudioUserFromHeaders(new Headers())).toBeNull();
  });

  test("a Better Auth customer cookie → null", async () => {
    const user = await getStudioUserFromHeaders(
      new Headers({ cookie: "better-auth.session_token=not-a-payload-token" }),
    );
    expect(user).toBeNull();
  });

  test("a garbage payload-token → null", async () => {
    const user = await getStudioUserFromHeaders(
      new Headers({ cookie: "payload-token=garbage.token.value" }),
    );
    expect(user).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/studio/auth.test.ts`
Expected: FAIL — cannot resolve `@/lib/studio-auth`.

- [ ] **Step 3: Implement `lib/studio-auth.ts`**

```ts
/**
 * Studio auth bridge — server-only.
 *
 * The /studio panel is staff tooling, gated by Payload's OWN auth (the
 * `admins` collection — the same login as /admin). This module is the single
 * doorway for "who is the staff member on this request":
 *
 *   - `getStudioUserFromHeaders(h)` — resolves the payload-token cookie via
 *     the Local API (`payload.auth`) and returns the user ONLY if they come
 *     from the `admins` collection. Customer (Better Auth) sessions live in a
 *     different cookie namespace and resolve to null here. Testable directly.
 *   - `getStudioUser()` — same, from the current request's headers.
 *   - `requireStudioUser()` — throws unless staff; call at the TOP of every
 *     studio mutation (mirrors assertOwnsOrder in lib/order-actions.ts).
 *
 * The pretty UI is never the security boundary — this module is.
 */
import { headers } from "next/headers";

import { getPayloadClient } from "@/lib/payload";

export interface StudioUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getStudioUserFromHeaders(
  h: Headers,
): Promise<StudioUser | null> {
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: h });
  if (!user || user.collection !== "admins") return null;
  return {
    id: String(user.id),
    email: String(user.email),
    name: (user as { name?: string | null }).name ?? null,
  };
}

/** The staff member on the current request, or null. */
export async function getStudioUser(): Promise<StudioUser | null> {
  return getStudioUserFromHeaders(await headers());
}

/** Throws unless the current request is a signed-in staff member. */
export async function requireStudioUser(): Promise<StudioUser> {
  const user = await getStudioUser();
  if (!user) {
    throw new Error("You need to be signed in to the studio to do that.");
  }
  return user;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/studio/auth.test.ts`
Expected: PASS (4 tests). If `payload.login` lacks a `token` in its return, check `removeTokenFromResponses` is not set on Admins (it is not) before debugging further.

- [ ] **Step 5: Commit**

```bash
git add lib/studio-auth.ts tests/studio/auth.test.ts
git commit -m "feat(studio): admins-session auth bridge (payload.auth doorway)"
```

---

### Task 5: Workflow + revenue core (`lib/studio-workflow.ts`) — TDD

All studio business rules as pure functions: status chips, next-step transitions, guardrail requirements, attention/in-the-works queues, revenue totals, money/age formatting.

**Files:**
- Create: `lib/studio-workflow.ts`
- Test: `tests/studio/workflow.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Studio workflow core tests — pure, no DB, no DOM.
 */
import { describe, expect, test } from "vitest";

import {
  STATUS_CHIPS,
  NEXT_STEPS,
  requirementFor,
  needsAttention,
  inTheWorks,
  computeRevenueTotals,
  formatCents,
  type StudioOrder,
} from "@/lib/studio-workflow";

const NOW = new Date("2026-06-10T12:00:00.000Z");

function order(partial: Partial<StudioOrder> & { id: string }): StudioOrder {
  return {
    status: "paid",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  } as StudioOrder;
}

describe("chips and transitions", () => {
  test("every status has a chip label", () => {
    expect(STATUS_CHIPS.paid.label).toBe("New order");
    expect(STATUS_CHIPS.revisions.label).toBe("Changes requested");
    expect(STATUS_CHIPS.approved.label).toBe("Ready to deliver");
    expect(Object.keys(STATUS_CHIPS)).toHaveLength(9);
  });

  test("next steps follow the spec table", () => {
    expect(NEXT_STEPS.paid.map((s) => s.to)).toEqual([
      "awaiting_assets",
      "in_production",
    ]);
    expect(NEXT_STEPS.revisions.map((s) => s.to)).toEqual([
      "in_production",
      "proof_ready",
    ]);
    expect(NEXT_STEPS.approved.map((s) => s.to)).toEqual(["delivered"]);
    expect(NEXT_STEPS.proof_ready).toEqual([]);
    expect(NEXT_STEPS.delivered).toEqual([]);
  });

  test("guardrails: proof_ready needs a proof, delivered needs the final film", () => {
    expect(requirementFor("proof_ready")).toBe("proof");
    expect(requirementFor("delivered")).toBe("finalVideo");
    expect(requirementFor("in_production")).toBeNull();
  });
});

describe("queues", () => {
  const docs: StudioOrder[] = [
    order({ id: "a", status: "paid", createdAt: "2026-06-09T00:00:00.000Z" }),
    order({ id: "b", status: "revisions", createdAt: "2026-06-05T00:00:00.000Z" }),
    order({ id: "c", status: "in_production", createdAt: "2026-06-06T00:00:00.000Z" }),
    order({ id: "d", status: "delivered", createdAt: "2026-06-01T00:00:00.000Z" }),
    order({ id: "e", status: "approved", createdAt: "2026-06-08T00:00:00.000Z" }),
    order({ id: "f", status: "proof_ready", createdAt: "2026-06-07T00:00:00.000Z" }),
  ];

  test("needsAttention picks the studio's-move statuses, oldest first", () => {
    expect(needsAttention(docs).map((o) => o.id)).toEqual(["b", "e", "a"]);
  });

  test("inTheWorks picks moving orders, oldest first", () => {
    expect(inTheWorks(docs).map((o) => o.id)).toEqual(["c", "f"]);
  });
});

describe("revenue", () => {
  const docs: StudioOrder[] = [
    // counted, this month + last 30 days
    order({ id: "1", amountTotalCents: 45000, createdAt: "2026-06-02T00:00:00.000Z", status: "delivered" }),
    // counted, NOT this calendar month, inside last 30 days
    order({ id: "2", amountTotalCents: 30000, createdAt: "2026-05-20T00:00:00.000Z", status: "in_production" }),
    // counted all-time only
    order({ id: "3", amountTotalCents: 90000, createdAt: "2026-03-01T00:00:00.000Z", status: "delivered" }),
    // refunded → excluded entirely
    order({ id: "4", amountTotalCents: 45000, createdAt: "2026-06-03T00:00:00.000Z", status: "refunded" }),
    // cancelled (dispute) → excluded entirely
    order({ id: "5", amountTotalCents: 45000, createdAt: "2026-06-04T00:00:00.000Z", status: "cancelled" }),
    // no recorded amount → counts as $0 but flags the footnote
    order({ id: "6", createdAt: "2026-06-05T00:00:00.000Z", status: "paid" }),
  ];

  test("totals exclude refunded/cancelled and window correctly", () => {
    const totals = computeRevenueTotals(docs, NOW);
    expect(totals.allTime).toEqual({ cents: 165000, count: 4 });
    expect(totals.thisMonth).toEqual({ cents: 45000, count: 2 });
    expect(totals.last30Days).toEqual({ cents: 75000, count: 3 });
    expect(totals.hasUnrecordedAmounts).toBe(true);
  });

  test("hasUnrecordedAmounts is false when every counted order has an amount", () => {
    const totals = computeRevenueTotals(docs.slice(0, 3), NOW);
    expect(totals.hasUnrecordedAmounts).toBe(false);
  });
});

describe("formatCents", () => {
  test("whole dollars get no decimals; cents keep two", () => {
    expect(formatCents(435000)).toBe("$4,350");
    expect(formatCents(0)).toBe("$0");
    expect(formatCents(45050)).toBe("$450.50");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/studio/workflow.test.ts`
Expected: FAIL — cannot resolve `@/lib/studio-workflow`.

- [ ] **Step 3: Implement `lib/studio-workflow.ts`**

```ts
/**
 * Studio workflow core — the panel's business rules as pure data + functions.
 * No React, no DB, no Next.js; unit-tested in tests/studio/workflow.test.ts.
 *
 * Staff-facing labels live here (sentence case, calm — same voice as the rest
 * of the site even though only the two of us read it). Customer-facing copy
 * does NOT live here — see lib/order-stages.ts and lib/delivery.ts.
 */
import type { OrderStatus } from "@/lib/order-stages";

/** The slice of an order doc the studio pages work with (depth 0). */
export interface StudioOrder {
  id: string;
  status: OrderStatus;
  createdAt: string;
  childName?: string | null;
  world?: string | null;
  length?: string | null;
  detailLevel?: string | null;
  amountTotalCents?: number | null;
  promisedBy?: string | null;
  revisionNote?: string | null;
  stripePaymentIntentId?: string | null;
  proof?: unknown;
  finalVideo?: unknown;
}

export const ALL_STATUSES: readonly OrderStatus[] = [
  "paid",
  "awaiting_assets",
  "in_production",
  "proof_ready",
  "revisions",
  "approved",
  "delivered",
  "refunded",
  "cancelled",
] as const;

/** Studio chip label + tone per status (tone maps to brand colors in the UI). */
export const STATUS_CHIPS: Record<
  OrderStatus,
  { label: string; tone: "yellow" | "pink" | "blue" | "plain" }
> = {
  paid: { label: "New order", tone: "yellow" },
  awaiting_assets: { label: "Waiting for photos", tone: "plain" },
  in_production: { label: "In production", tone: "plain" },
  proof_ready: { label: "With the parent", tone: "plain" },
  revisions: { label: "Changes requested", tone: "pink" },
  approved: { label: "Ready to deliver", tone: "blue" },
  delivered: { label: "Delivered", tone: "plain" },
  refunded: { label: "Refunded", tone: "plain" },
  cancelled: { label: "Cancelled", tone: "plain" },
};

/** The natural next steps offered per status (spec's transition table). */
export const NEXT_STEPS: Record<
  OrderStatus,
  { label: string; to: OrderStatus }[]
> = {
  paid: [
    { label: "Request photos", to: "awaiting_assets" },
    { label: "Start production", to: "in_production" },
  ],
  awaiting_assets: [{ label: "Start production", to: "in_production" }],
  in_production: [{ label: "Share the proof", to: "proof_ready" }],
  proof_ready: [],
  revisions: [
    { label: "Back to production", to: "in_production" },
    { label: "Share a new proof", to: "proof_ready" },
  ],
  approved: [{ label: "Mark delivered", to: "delivered" }],
  delivered: [],
  refunded: [],
  cancelled: [],
};

/**
 * Server-enforced guardrails: what must be attached before an order may enter
 * a status. The buttons disable in the UI too, but THIS is the boundary.
 */
export function requirementFor(
  status: OrderStatus,
): "proof" | "finalVideo" | null {
  if (status === "proof_ready") return "proof";
  if (status === "delivered") return "finalVideo";
  return null;
}

const ATTENTION: readonly OrderStatus[] = ["paid", "revisions", "approved"];
const MOVING: readonly OrderStatus[] = [
  "awaiting_assets",
  "in_production",
  "proof_ready",
];

const byOldestFirst = (a: StudioOrder, b: StudioOrder) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/** Orders whose next move is the studio's, oldest first. */
export function needsAttention(orders: StudioOrder[]): StudioOrder[] {
  return orders.filter((o) => ATTENTION.includes(o.status)).sort(byOldestFirst);
}

/** Orders that are moving but are someone else's turn / already in progress. */
export function inTheWorks(orders: StudioOrder[]): StudioOrder[] {
  return orders.filter((o) => MOVING.includes(o.status)).sort(byOldestFirst);
}

export interface RevenueWindow {
  cents: number;
  count: number;
}

export interface RevenueTotals {
  allTime: RevenueWindow;
  thisMonth: RevenueWindow;
  last30Days: RevenueWindow;
  /** True when a counted order has no recorded amount (pre-launch rows). */
  hasUnrecordedAmounts: boolean;
}

/**
 * Revenue = sum of what Stripe charged, over orders that are not refunded and
 * not cancelled (a dispute means the money is gone). Orders with no recorded
 * amount count as $0 and raise the footnote flag.
 */
export function computeRevenueTotals(
  orders: StudioOrder[],
  now: Date,
): RevenueTotals {
  const counted = orders.filter(
    (o) => o.status !== "refunded" && o.status !== "cancelled",
  );
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const windowOf = (filter: (createdMs: number) => boolean): RevenueWindow => {
    let cents = 0;
    let count = 0;
    for (const o of counted) {
      const createdMs = new Date(o.createdAt).getTime();
      if (!filter(createdMs)) continue;
      count += 1;
      cents += o.amountTotalCents ?? 0;
    }
    return { cents, count };
  };

  return {
    allTime: windowOf(() => true),
    thisMonth: windowOf((ms) => ms >= monthStart),
    last30Days: windowOf((ms) => ms >= thirtyDaysAgo),
    hasUnrecordedAmounts: counted.some(
      (o) => o.amountTotalCents === null || o.amountTotalCents === undefined,
    ),
  };
}

/** "$4,350" for whole dollars, "$450.50" when cents are in play. */
export function formatCents(cents: number): string {
  const wholeDollars = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: wholeDollars ? 0 : 2,
    maximumFractionDigits: wholeDollars ? 0 : 2,
  }).format(cents / 100);
}

/** "3 hours ago" / "2 days ago" — coarse, for queue rows. */
export function formatAge(createdAt: string, now: Date): string {
  const ms = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run tests/studio/workflow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/studio-workflow.ts tests/studio/workflow.test.ts
git commit -m "feat(studio): pure workflow core — chips, transitions, queues, revenue"
```

---

### Task 6: Studio mutations (`lib/studio-actions.ts`) — TDD

Server actions for status changes and the promise date. Cores are exported separately so DB tests don't need to fake request headers.

**Files:**
- Create: `lib/studio-actions.ts`
- Test: `tests/studio/actions.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Studio mutation core tests — DB-backed. The cores skip the requireStudioUser
 * header check (tested separately in tests/studio/auth.test.ts); guardrails and
 * persistence are what's under test here.
 */
import { describe, expect, test } from "vitest";

import { applyOrderStatusCore, applyPromisedByCore } from "@/lib/studio-actions";
import { getPayloadClient } from "@/lib/payload";

async function seedOrder(status: string) {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: {
      email: `studio-actions-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: true,
    },
    overrideAccess: true,
  });
  const order = await payload.create({
    collection: "orders",
    data: { owner: user.id, status, childName: "Guard" },
    overrideAccess: true,
  });
  return { payload, order };
}

describe("applyOrderStatusCore", () => {
  test("happy path: paid → in_production persists", async () => {
    const { payload, order } = await seedOrder("paid");
    const result = await applyOrderStatusCore(String(order.id), "in_production");
    expect(result).toEqual({ ok: true });
    const fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(fresh.status).toBe("in_production");
  });

  test("guardrail: proof_ready without a proof is rejected, order untouched", async () => {
    const { payload, order } = await seedOrder("in_production");
    const result = await applyOrderStatusCore(String(order.id), "proof_ready");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/preview film/i);
    const fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(fresh.status).toBe("in_production");
  });

  test("guardrail: delivered without a final film is rejected", async () => {
    const { order } = await seedOrder("approved");
    const result = await applyOrderStatusCore(String(order.id), "delivered");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/final film/i);
  });

  test("guardrail passes once the attachment exists", async () => {
    const { payload, order } = await seedOrder("approved");
    const media = await payload.create({
      collection: "media",
      data: { alt: "test film" },
      file: {
        data: Buffer.from("not-really-a-video"),
        name: `guard-final-${Date.now()}.mp4`,
        mimetype: "video/mp4",
        size: 18,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { finalVideo: media.id },
      overrideAccess: true,
    });
    const result = await applyOrderStatusCore(String(order.id), "delivered");
    expect(result).toEqual({ ok: true });
  });

  test("unknown status value is rejected", async () => {
    const { order } = await seedOrder("paid");
    // @ts-expect-error — deliberately invalid input
    const result = await applyOrderStatusCore(String(order.id), "exploded");
    expect(result.ok).toBe(false);
  });
});

describe("applyPromisedByCore", () => {
  test("sets and clears the promise", async () => {
    const { payload, order } = await seedOrder("in_production");
    const iso = "2026-07-01T12:00:00.000Z";
    expect(await applyPromisedByCore(String(order.id), iso)).toEqual({ ok: true });
    let fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(new Date(fresh.promisedBy as string).toISOString()).toBe(iso);

    expect(await applyPromisedByCore(String(order.id), null)).toEqual({ ok: true });
    fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(fresh.promisedBy ?? null).toBeNull();
  });

  test("rejects an unparseable date", async () => {
    const { order } = await seedOrder("in_production");
    const result = await applyPromisedByCore(String(order.id), "not-a-date");
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/studio/actions.test.ts`
Expected: FAIL — cannot resolve `@/lib/studio-actions`.

- [ ] **Step 3: Implement `lib/studio-actions.ts`**

```ts
"use server";

/**
 * Studio actions — server-only mutations the /studio panel calls.
 *
 * SECURITY (non-negotiable): every exported ACTION begins with
 * `requireStudioUser()` (lib/studio-auth.ts) — only signed-in staff mutate.
 * The *Core functions skip that check ON PURPOSE so DB tests can exercise the
 * guardrails directly; they must only ever be called from this module's
 * actions (or tests).
 *
 * Status changes go through the Payload Local API, so the Orders afterChange
 * hook still fires — moving to proof_ready or delivered emails the parent
 * exactly as it does from /admin.
 */
import { revalidatePath } from "next/cache";

import { requireStudioUser } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";
import {
  ALL_STATUSES,
  requirementFor,
} from "@/lib/studio-workflow";
import type { OrderStatus } from "@/lib/order-stages";

export type StudioActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR =
  "Something went wrong while saving. Please try again in a moment.";

function revalidateStudioAndCustomer(orderId: string) {
  revalidatePath("/studio");
  revalidatePath("/studio/orders");
  revalidatePath(`/studio/orders/${orderId}`);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}

/**
 * Core: set an order's status, enforcing the attachment guardrails
 * (proof_ready needs a proof; delivered needs the final film).
 */
export async function applyOrderStatusCore(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StudioActionResult> {
  if (!ALL_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "That is not a valid status." };
  }

  const payload = await getPayloadClient();
  let order;
  try {
    order = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    return { ok: false, error: "We could not find that order." };
  }

  const requirement = requirementFor(nextStatus);
  if (requirement === "proof" && !order.proof) {
    return {
      ok: false,
      error: "Add a preview film before sharing the proof with the parent.",
    };
  }
  if (requirement === "finalVideo" && !order.finalVideo) {
    return {
      ok: false,
      error: "Upload the final film before marking the order delivered.",
    };
  }

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: nextStatus },
    overrideAccess: true,
  });
  return { ok: true };
}

/** Action: staff sets an order's status (guardrails enforced in the core). */
export async function setOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StudioActionResult> {
  await requireStudioUser();
  try {
    const result = await applyOrderStatusCore(orderId, nextStatus);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setOrderStatus failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Core: set (ISO string) or clear (null) an order's promised-by date. */
export async function applyPromisedByCore(
  orderId: string,
  promisedByIso: string | null,
): Promise<StudioActionResult> {
  if (promisedByIso !== null) {
    const parsed = new Date(promisedByIso);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "That date did not look right. Please pick it again." };
    }
  }
  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { promisedBy: promisedByIso },
      overrideAccess: true,
    });
  } catch {
    return { ok: false, error: "We could not find that order." };
  }
  return { ok: true };
}

/** Action: staff adjusts the delivery promise shown to the parent. */
export async function setPromisedBy(
  orderId: string,
  promisedByIso: string | null,
): Promise<StudioActionResult> {
  await requireStudioUser();
  try {
    const result = await applyPromisedByCore(orderId, promisedByIso);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setPromisedBy failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/studio/`
Expected: PASS (auth + actions + workflow files). Note: the proof_ready/delivered transitions in tests fire the status-email hook; `lib/email.ts` warns-and-returns without RESEND_API_KEY outside production, so tests stay green and offline.

- [ ] **Step 5: Commit**

```bash
git add lib/studio-actions.ts tests/studio/actions.test.ts
git commit -m "feat(studio): status + promise mutations with server-enforced guardrails"
```

---

### Task 7: Studio shell — layouts, sign-in, nav, robots

**Files:**
- Create: `app/studio/layout.tsx` (noindex + cream shell, NOT the gate)
- Create: `app/studio/(gated)/layout.tsx` (the auth gate + nav)
- Create: `app/studio/sign-in/page.tsx` (public, branded form)
- Create: `components/studio/studio-nav.tsx`
- Create: `components/studio/sign-out-button.tsx`
- Modify: `app/robots.ts:14`

Route shape: `(gated)` is a route group (no URL segment) — `/studio` → `(gated)/page.tsx` (Task 8), `/studio/sign-in` stays OUTSIDE the gate so the redirect can never trap it (same trick as the customer sign-in page).

- [ ] **Step 1: `app/studio/layout.tsx`**

```tsx
/**
 * /studio shell — noindex + the cream page background for every studio page,
 * INCLUDING sign-in. This layout does NOT gate: the auth check lives in the
 * (gated) group layout so /studio/sign-in stays reachable when signed out.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Studio — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default function StudioShellLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-brand-cream pb-24 pt-10 font-[family-name:var(--font-quicksand)] text-brand-deep">
      {children}
    </main>
  );
}
```

- [ ] **Step 2: `app/studio/(gated)/layout.tsx`**

```tsx
/**
 * Authoritative gate for every /studio page except sign-in.
 *
 * `getStudioUser()` resolves the payload-token cookie via the Local API and
 * requires the `admins` collection — the same login as /admin, so staff sign
 * in once for both. Customer (Better Auth) sessions use a different cookie and
 * always resolve to null here. No optimistic proxy layer: studio traffic is
 * two people, one DB round-trip per navigation is fine.
 */
import { redirect } from "next/navigation";

import { getStudioUser } from "@/lib/studio-auth";
import { StudioNav } from "@/components/studio/studio-nav";

export default async function StudioGateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getStudioUser();
  if (!user) redirect("/studio/sign-in");

  return (
    <div className="mx-auto max-w-5xl px-6">
      <StudioNav email={user.email} />
      {children}
    </div>
  );
}
```

- [ ] **Step 3: `components/studio/studio-nav.tsx` + sign-out button**

```tsx
/**
 * StudioNav — the floating pill across the top of every gated studio page.
 * Server component; the sign-out button is the only client island.
 * External links (Stripe) open in a new tab and say so for assistive tech.
 */
import Link from "next/link";

import { SignOutButton } from "@/components/studio/sign-out-button";

export function StudioNav({ email }: { email: string }) {
  return (
    <nav
      aria-label="Studio"
      className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-full border-2 border-brand-deep bg-white px-5 py-2.5 shadow-comic"
    >
      <Link
        href="/studio"
        className="text-lg text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        Yours Fairy Tale <span className="text-brand-pink">· studio</span>
      </Link>
      <div
        className="flex flex-wrap items-center gap-4 text-sm font-bold"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        <Link href="/studio" className="underline-offset-4 hover:underline">
          Dashboard
        </Link>
        <Link href="/studio/orders" className="underline-offset-4 hover:underline">
          Orders
        </Link>
        <a
          href="https://dashboard.stripe.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Stripe dashboard (opens in a new tab)"
          className="underline-offset-4 hover:underline"
        >
          Stripe ↗
        </a>
        <a
          href="/admin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Payload admin (opens in a new tab)"
          className="underline-offset-4 hover:underline"
        >
          Admin ↗
        </a>
        <span className="hidden text-brand-deep/50 sm:inline" title={email}>
          {email}
        </span>
        <SignOutButton />
      </div>
    </nav>
  );
}
```

```tsx
"use client";

/**
 * Sign out of the studio: POST to Payload's logout endpoint (clears the
 * payload-token cookie), then hard-navigate to sign-in so every server
 * component re-evaluates with the cookie gone.
 */
export function SignOutButton() {
  async function handleSignOut() {
    try {
      await fetch("/api/admins/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/studio/sign-in";
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-brand-deep/60 underline-offset-4 hover:underline"
    >
      Sign out
    </button>
  );
}
```

- [ ] **Step 4: `app/studio/sign-in/page.tsx`**

```tsx
"use client";

/**
 * /studio/sign-in — staff sign-in (email + password against the `admins`
 * collection). Posts to Payload's REST login endpoint, which sets the same
 * payload-token cookie /admin uses; on success we land on the dashboard.
 * PUBLIC route — lives outside the (gated) group so the gate redirect can
 * never trap it. Password resets happen in /admin; no sign-up path exists.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function StudioSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/admins/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      router.push("/studio");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg">
        <Image
          src="/mascot/builder-static.png"
          alt=""
          width={120}
          height={120}
          unoptimized
          className="mx-auto -mt-16 h-28 w-28 object-contain drop-shadow-[4px_4px_0_rgba(26,16,51,0.2)]"
        />
        <h1
          className="mt-2 text-center text-3xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          The studio
        </h1>
        <p
          className="mt-1 text-center text-sm text-brand-deep/70"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Sign in with your staff account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-bold text-brand-deep">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-2 border-brand-deep bg-brand-cream px-4 py-2.5 font-semibold outline-none focus:shadow-comic-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold text-brand-deep">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-2 border-brand-deep bg-brand-cream px-4 py-2.5 font-semibold outline-none focus:shadow-comic-sm"
            />
          </label>

          {status === "error" ? (
            <p role="alert" className="text-sm font-semibold text-brand-pink">
              That email and password did not match. Please try again.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === "loading"}
            className="rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-60"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {status === "loading" ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Keep `/studio` out of robots**

In `app/robots.ts`, change the disallow line to:

```ts
      disallow: ["/app", "/admin", "/api", "/sign-in", "/studio"],
```

- [ ] **Step 6: Typecheck + existing robots/nav tests**

Run: `npx tsc --noEmit && npx vitest run tests/app/`
Expected: clean / PASS.

- [ ] **Step 7: Commit**

```bash
git add app/studio app/robots.ts components/studio
git commit -m "feat(studio): shell — admins-gated layout, branded sign-in, nav, noindex"
```

---

### Task 8: Dashboard page (`/studio`)

**Files:**
- Create: `lib/studio-data.ts` (fetch helper)
- Create: `components/studio/status-chip.tsx`
- Create: `app/studio/(gated)/page.tsx`

- [ ] **Step 1: `lib/studio-data.ts`**

```ts
/**
 * Studio data bridge — server-only reads for the staff panel.
 * All orders, no owner scoping (the studio sees everything); access is gated
 * by the (gated) layout + requireStudioUser on mutations, not here.
 */
import { getPayloadClient } from "@/lib/payload";
import type { StudioOrder } from "@/lib/studio-workflow";

/** Every order, newest first. Tiny volume — pagination off, like the customer read. */
export async function getAllOrders(): Promise<StudioOrder[]> {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    pagination: false,
    sort: "-createdAt",
  });
  return result.docs as unknown as StudioOrder[];
}
```

- [ ] **Step 2: `components/studio/status-chip.tsx`**

```tsx
/**
 * StatusChip — the studio's colored status pill. Tones map to brand colors;
 * labels come from the workflow core (single source of truth).
 */
import { STATUS_CHIPS } from "@/lib/studio-workflow";
import type { OrderStatus } from "@/lib/order-stages";

const TONE_CLASSES: Record<string, string> = {
  yellow: "bg-brand-yellow text-brand-deep",
  pink: "bg-brand-pink text-white",
  blue: "bg-brand-blue text-brand-deep",
  plain: "bg-white text-brand-deep/70",
};

export function StatusChip({ status }: { status: OrderStatus }) {
  const chip = STATUS_CHIPS[status];
  return (
    <span
      className={`inline-block rounded-full border-2 border-brand-deep px-2.5 py-0.5 text-xs font-bold ${TONE_CLASSES[chip.tone]}`}
      style={{ fontFamily: "var(--font-quicksand)" }}
    >
      {chip.label}
    </span>
  );
}
```

- [ ] **Step 3: `app/studio/(gated)/page.tsx`**

```tsx
/**
 * /studio — the dashboard: revenue cards, the needs-attention queue, the
 * in-the-works list, and quick links. Pure read; all numbers come from the
 * unit-tested workflow core.
 */
import Link from "next/link";

import { getAllOrders } from "@/lib/studio-data";
import {
  computeRevenueTotals,
  needsAttention,
  inTheWorks,
  formatCents,
  formatAge,
  STATUS_CHIPS,
} from "@/lib/studio-workflow";
import { StatusChip } from "@/components/studio/status-chip";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { LENGTH_LABELS } from "@/lib/order-options";

export default async function StudioDashboardPage() {
  const orders = await getAllOrders();
  const now = new Date();
  const totals = computeRevenueTotals(orders, now);
  const attention = needsAttention(orders);
  const moving = inTheWorks(orders);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Studio
        </h1>
        <p className="mt-1 text-brand-deep/70">Here is how the storybook shop is doing.</p>
      </header>

      <section aria-label="Revenue" className="mb-10 grid gap-4 sm:grid-cols-3">
        <RevenueCard label="All time" window={totals.allTime} highlight />
        <RevenueCard label="This month" window={totals.thisMonth} />
        <RevenueCard label="Last 30 days" window={totals.last30Days} />
      </section>
      {totals.hasUnrecordedAmounts ? (
        <p className="-mt-7 mb-8 text-xs text-brand-deep/50">
          Older orders without recorded amounts are not counted. Refunded and
          disputed orders are left out.
        </p>
      ) : (
        <p className="-mt-7 mb-8 text-xs text-brand-deep/50">
          Refunded and disputed orders are left out.
        </p>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-label="Needs your attention">
          <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            Needs your attention{" "}
            {attention.length > 0 ? (
              <span className="ml-1 inline-block rounded-full bg-brand-pink px-2.5 py-0.5 align-middle text-sm font-bold text-white">
                {attention.length}
              </span>
            ) : null}
          </h2>

          {attention.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-brand-deep bg-white p-8 text-center shadow-comic">
              {/* eslint-disable-next-line @next/next/no-img-element -- animated webp; next/image will not animate it */}
              <img
                src="/mascot/builder-360.webp"
                alt=""
                width={180}
                height={180}
                loading="lazy"
                className="h-44 w-auto"
              />
              <p className="mt-2 font-bold text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                All caught up
              </p>
              <p className="mt-1 text-sm text-brand-deep/60">Nothing needs you right now.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {attention.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/studio/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic transition-shadow hover:shadow-comic-lg"
                  >
                    <div>
                      <StatusChip status={order.status} />
                      <p className="mt-2 font-bold text-brand-deep">
                        {order.childName?.trim() || "Unnamed hero"}
                        {order.world ? ` — ${WORLD_LABELS[order.world as WorldId] ?? order.world}` : ""}
                        {order.length ? ` · ${LENGTH_LABELS[order.length] ?? order.length}` : ""}
                      </p>
                      {order.status === "revisions" && order.revisionNote ? (
                        <p className="mt-1 line-clamp-1 text-sm text-brand-deep/60">
                          &ldquo;{order.revisionNote}&rdquo;
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-brand-deep/50">
                        {STATUS_CHIPS[order.status].label.toLowerCase()} · {formatAge(order.createdAt, now)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {typeof order.amountTotalCents === "number" ? (
                        <p className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                          {formatCents(order.amountTotalCents)}
                        </p>
                      ) : null}
                      <span aria-hidden="true" className="text-brand-deep/50">→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-8">
          <section aria-label="In the works">
            <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              In the works
            </h2>
            <div className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic">
              {moving.length === 0 ? (
                <p className="text-sm text-brand-deep/60">Nothing in motion right now.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-dashed divide-brand-deep/20">
                  {moving.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/studio/orders/${order.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:underline"
                      >
                        <span className="font-bold text-brand-deep">
                          {order.childName?.trim() || "Unnamed hero"}
                          {order.world ? ` — ${WORLD_LABELS[order.world as WorldId] ?? order.world}` : ""}
                        </span>
                        <span className="text-brand-deep/60">{STATUS_CHIPS[order.status].label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-label="Quick links">
            <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Quick links
            </h2>
            <div className="rounded-3xl bg-brand-deep p-5 text-sm font-bold text-brand-cream">
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Stripe dashboard (opens in a new tab)"
                className="block py-1.5 underline-offset-4 hover:underline"
              >
                Stripe dashboard ↗
              </a>
              <a
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Payload admin (opens in a new tab)"
                className="block py-1.5 underline-offset-4 hover:underline"
              >
                Payload admin ↗
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RevenueCard({
  label,
  window: w,
  highlight = false,
}: {
  label: string;
  window: { cents: number; count: number };
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border-2 border-brand-deep p-5 shadow-comic ${
        highlight ? "bg-brand-yellow" : "bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-brand-deep/60">{label}</p>
      <p className="mt-1 text-3xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        {formatCents(w.cents)}
      </p>
      <p className="mt-0.5 text-xs text-brand-deep/60">
        {w.count === 1 ? "1 film" : `${w.count} films`}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add lib/studio-data.ts components/studio/status-chip.tsx "app/studio/(gated)/page.tsx"
git commit -m "feat(studio): dashboard — revenue cards, attention queue, quick links"
```

---

### Task 9: Order list page (`/studio/orders`)

**Files:**
- Create: `app/studio/(gated)/orders/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
/**
 * /studio/orders — every order, newest first, filterable by status via the
 * `?status=` search param (chips across the top; links, not client state).
 */
import Link from "next/link";

import { getAllOrders } from "@/lib/studio-data";
import {
  ALL_STATUSES,
  STATUS_CHIPS,
  formatCents,
  formatAge,
} from "@/lib/studio-workflow";
import { StatusChip } from "@/components/studio/status-chip";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { LENGTH_LABELS } from "@/lib/order-options";
import type { OrderStatus } from "@/lib/order-stages";

export default async function StudioOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = ALL_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : null;

  const all = await getAllOrders();
  const orders = filter ? all.filter((o) => o.status === filter) : all;
  const now = new Date();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-4xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Orders
        </h1>
      </header>

      <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
        <FilterChip href="/studio/orders" label="All" active={!filter} />
        {ALL_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/studio/orders?status=${s}`}
            label={STATUS_CHIPS[s].label}
            active={filter === s}
          />
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-3xl border-2 border-brand-deep bg-white p-8 text-center text-brand-deep/60 shadow-comic">
          No orders here yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/studio/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-brand-deep bg-white px-5 py-3.5 shadow-comic-sm transition-shadow hover:shadow-comic"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusChip status={order.status} />
                  <span className="truncate font-bold text-brand-deep">
                    {order.childName?.trim() || "Unnamed hero"}
                    {order.world ? ` — ${WORLD_LABELS[order.world as WorldId] ?? order.world}` : ""}
                    {order.length ? ` · ${LENGTH_LABELS[order.length] ?? order.length}` : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm text-brand-deep/60">
                  {typeof order.amountTotalCents === "number" ? (
                    <span className="font-bold text-brand-deep">
                      {formatCents(order.amountTotalCents)}
                    </span>
                  ) : null}
                  <span>{formatAge(order.createdAt, now)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border-2 border-brand-deep px-3 py-1 text-xs font-bold transition-shadow hover:shadow-comic-sm ${
        active ? "bg-brand-deep text-brand-cream" : "bg-white text-brand-deep"
      }`}
      style={{ fontFamily: "var(--font-quicksand)" }}
    >
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Typecheck, commit**

Run: `npx tsc --noEmit`

```bash
git add "app/studio/(gated)/orders/page.tsx"
git commit -m "feat(studio): order list with status filter chips"
```

---

### Task 10: Order workstation (`/studio/orders/[id]`)

**Files:**
- Create: `app/studio/(gated)/orders/[id]/page.tsx`
- Create: `components/studio/workflow-card.tsx` (client)
- Create: `components/studio/promised-by-editor.tsx` (client)

- [ ] **Step 1: `components/studio/workflow-card.tsx`**

```tsx
"use client";

/**
 * WorkflowCard — current status, the natural next-step buttons, and the
 * set-any-status fallback. Calls the setOrderStatus server action; the
 * guardrails live server-side — a rejected change shows its calm message here.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setOrderStatus } from "@/lib/studio-actions";
import type { OrderStatus } from "@/lib/order-stages";

interface NextStep {
  label: string;
  to: OrderStatus;
}

export function WorkflowCard({
  orderId,
  status,
  statusLabel,
  nextSteps,
  allStatuses,
  statusLabels,
}: {
  orderId: string;
  status: OrderStatus;
  statusLabel: string;
  nextSteps: NextStep[];
  allStatuses: OrderStatus[];
  statusLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState<OrderStatus | "">("");

  function applyStatus(to: OrderStatus) {
    setError("");
    startTransition(async () => {
      const result = await setOrderStatus(orderId, to);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      aria-label="Workflow"
      className="rounded-3xl bg-brand-deep p-5 text-brand-cream"
    >
      <h2 className="text-lg" style={{ fontFamily: "var(--font-fredoka)" }}>
        Workflow
      </h2>
      <p className="mt-1 text-sm text-brand-cream/80">
        This order is at <span className="font-bold">{statusLabel}</span>.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {nextSteps.map((step, index) => (
          <button
            key={step.to}
            type="button"
            disabled={pending}
            onClick={() => applyStatus(step.to)}
            className={
              index === 0
                ? "rounded-full border-2 border-brand-deep bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-60"
                : "rounded-full border-2 border-brand-cream bg-transparent px-5 py-2.5 text-sm font-bold text-brand-cream hover:bg-brand-cream/10 disabled:opacity-60"
            }
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {step.label}
          </button>
        ))}
        {nextSteps.length === 0 ? (
          <p className="text-sm text-brand-cream/60">
            Nothing for the studio to do at this step.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-brand-pink">
          {error}
        </p>
      ) : null}

      <div className="mt-5 border-t border-brand-cream/20 pt-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-brand-cream/70">
          Set any status
          <div className="flex gap-2">
            <select
              value={fallback}
              onChange={(e) => setFallback(e.target.value as OrderStatus | "")}
              className="w-full rounded-xl border-2 border-brand-cream/40 bg-brand-deep px-3 py-2 text-sm font-semibold text-brand-cream"
            >
              <option value="">Choose a status...</option>
              {allStatuses
                .filter((s) => s !== status)
                .map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={pending || !fallback}
              onClick={() => fallback && applyStatus(fallback)}
              className="shrink-0 rounded-xl border-2 border-brand-cream/40 px-3 py-2 text-sm font-bold text-brand-cream hover:bg-brand-cream/10 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </label>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: `components/studio/promised-by-editor.tsx`**

```tsx
"use client";

/**
 * PromisedByEditor — the delivery promise the parent sees. A date input with
 * +1 week / +2 weeks presets (FROM TODAY, the moment the studio clicks).
 * Saving writes UTC noon of the chosen day so timezone wobble never moves the
 * promise across a date line.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setPromisedBy } from "@/lib/studio-actions";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function plusDaysFromToday(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function PromisedByEditor({
  orderId,
  promisedBy,
}: {
  orderId: string;
  promisedBy: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(toDateInputValue(promisedBy));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function save(next: string) {
    setMessage(null);
    startTransition(async () => {
      const iso = next ? `${next}T12:00:00.000Z` : null;
      const result = await setPromisedBy(orderId, iso);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: next ? "Promise updated." : "Promise cleared." });
      router.refresh();
    });
  }

  return (
    <section
      aria-label="Delivery promise"
      className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
    >
      <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        Promised by
      </h2>
      <p className="mt-1 text-xs text-brand-deep/60">
        The parent sees a countdown to this date. Move it if plans change.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Promised delivery date"
          className="rounded-xl border-2 border-brand-deep bg-brand-cream px-3 py-2 text-sm font-semibold text-brand-deep"
        />
        <button
          type="button"
          disabled={pending || !value}
          onClick={() => save(value)}
          className="rounded-full border-2 border-brand-deep bg-brand-blue px-4 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <div className="mt-2 flex gap-2 text-xs font-bold">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = plusDaysFromToday(7);
            setValue(next);
            save(next);
          }}
          className="rounded-full border-2 border-brand-deep bg-white px-3 py-1 text-brand-deep hover:shadow-comic-sm"
        >
          +1 week
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = plusDaysFromToday(14);
            setValue(next);
            save(next);
          }}
          className="rounded-full border-2 border-brand-deep bg-white px-3 py-1 text-brand-deep hover:shadow-comic-sm"
        >
          +2 weeks
        </button>
      </div>

      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-2 text-xs font-semibold ${
            message.kind === "error" ? "text-brand-pink" : "text-brand-deep/60"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 3: `app/studio/(gated)/orders/[id]/page.tsx`**

```tsx
/**
 * /studio/orders/[id] — the order workstation.
 * Left: what they ordered (story, photos, notes — read-only).
 * Right: the work (workflow controls, delivery promise, proof + final film).
 * The video upload slots arrive in the next task; this page mounts them last.
 */
import { notFound } from "next/navigation";
import Link from "next/link";

import { getPayloadClient } from "@/lib/payload";
import {
  NEXT_STEPS,
  STATUS_CHIPS,
  ALL_STATUSES,
  formatCents,
} from "@/lib/studio-workflow";
import { StatusChip } from "@/components/studio/status-chip";
import { WorkflowCard } from "@/components/studio/workflow-card";
import { PromisedByEditor } from "@/components/studio/promised-by-editor";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { LENGTH_LABELS, DETAIL_LEVEL_LABELS } from "@/lib/order-options";
import type { OrderStatus } from "@/lib/order-stages";

interface MediaDoc {
  id: string;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  createdAt?: string;
}

function relationId(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return value ? String(value) : null;
}

async function loadMedia(id: string | null): Promise<MediaDoc | null> {
  if (!id) return null;
  try {
    const payload = await getPayloadClient();
    return (await payload.findByID({
      collection: "media",
      id,
      depth: 0,
      overrideAccess: true,
    })) as unknown as MediaDoc;
  } catch {
    return null;
  }
}

export default async function StudioOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPayloadClient();

  let order;
  try {
    order = await payload.findByID({
      collection: "orders",
      id,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    notFound();
  }

  const status = order.status as OrderStatus;
  const childName = (order.childName as string | null)?.trim() || "Unnamed hero";

  // Owner email for the header.
  let ownerEmail = "";
  const ownerId = relationId(order.owner);
  if (ownerId) {
    try {
      const owner = await payload.findByID({
        collection: "users",
        id: ownerId,
        depth: 0,
        overrideAccess: true,
      });
      ownerEmail = String(owner.email ?? "");
    } catch {
      /* leave blank — header copes */
    }
  }

  // Customer photos (assets), proof, final film.
  const assetIds = (Array.isArray(order.assets) ? order.assets : [])
    .map(relationId)
    .filter((v): v is string => Boolean(v));
  const assets = (await Promise.all(assetIds.map(loadMedia))).filter(
    (m): m is MediaDoc => m !== null,
  );
  const proof = await loadMedia(relationId(order.proof));
  const finalVideo = await loadMedia(relationId(order.finalVideo));

  const notes = (Array.isArray(order.customerNotes) ? order.customerNotes : []) as {
    message: string;
    createdAt?: string | null;
  }[];

  const world = order.world ? (WORLD_LABELS[order.world as WorldId] ?? String(order.world)) : null;
  const ordered = new Date(order.createdAt as string);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/studio/orders"
          className="text-sm font-bold text-brand-deep/70 underline-offset-4 hover:underline"
        >
          ← Back to orders
        </Link>
      </div>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            {childName}&rsquo;s fairy tale
          </h1>
          <p className="mt-1 text-sm text-brand-deep/60">
            {ownerEmail || "owner unknown"} · ordered{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }).format(ordered)}
          </p>
        </div>
        <div className="text-right">
          <StatusChip status={status} />
          <p className="mt-2 text-xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            {typeof order.amountTotalCents === "number"
              ? formatCents(order.amountTotalCents as number)
              : "amount not recorded"}
          </p>
          {order.stripePaymentIntentId ? (
            <a
              href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View this payment in Stripe (opens in a new tab)"
              className="text-xs font-bold text-brand-deep/60 underline-offset-4 hover:underline"
            >
              view in Stripe ↗
            </a>
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Left: what they ordered ─────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <section
            aria-label="The story they ordered"
            className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
          >
            <h2 className="mb-3 text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              The story they ordered
            </h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {world ? <Row label="World" value={world} /> : null}
              {order.length ? (
                <Row label="Length" value={LENGTH_LABELS[order.length as string] ?? String(order.length)} />
              ) : null}
              {order.detailLevel ? (
                <Row
                  label="Detail"
                  value={DETAIL_LEVEL_LABELS[order.detailLevel as string] ?? String(order.detailLevel)}
                />
              ) : null}
              {typeof order.extraMinutes === "number" && order.extraMinutes > 0 ? (
                <Row label="Extra minutes" value={String(order.extraMinutes)} />
              ) : null}
              {Array.isArray(order.addOns) && order.addOns.length > 0 ? (
                <Row label="Add-ons" value={(order.addOns as string[]).join(", ")} />
              ) : null}
            </dl>
            {typeof order.plotNote === "string" && order.plotNote.trim() ? (
              <div className="mt-3 rounded-2xl border-2 border-dashed border-brand-deep/30 bg-brand-cream p-3 text-sm">
                <span className="font-bold">Plot idea:</span>{" "}
                <span className="whitespace-pre-wrap">{order.plotNote.trim()}</span>
              </div>
            ) : null}
          </section>

          <section
            aria-label="Their photos"
            className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
          >
            <h2 className="mb-3 text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Their photos · {assets.length}
            </h2>
            {assets.length === 0 ? (
              <p className="text-sm text-brand-deep/60">No photos yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {assets.map((m) => (
                  <li key={m.id}>
                    {/* Staff browsers carry the payload-token cookie, so the
                        adminOnly-gated media URL serves for us (and 403s for
                        everyone else). */}
                    <a href={m.url ?? "#"} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element -- gated dynamic media URL */}
                      <img
                        src={m.url ?? ""}
                        alt={m.filename ?? "customer photo"}
                        width={96}
                        height={96}
                        loading="lazy"
                        className="h-24 w-24 rounded-xl border-2 border-brand-deep object-cover"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-label="Notes from the parent"
            className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
          >
            <h2 className="mb-3 text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Notes from the parent
            </h2>
            {typeof order.revisionNote === "string" && order.revisionNote.trim() ? (
              <div className="mb-3 rounded-2xl border-2 border-brand-pink bg-brand-pink/10 p-3 text-sm">
                <p className="font-bold text-brand-pink">Change request</p>
                <p className="mt-0.5 whitespace-pre-wrap text-brand-deep/80">
                  {order.revisionNote.trim()}
                </p>
              </div>
            ) : null}
            {notes.length === 0 ? (
              <p className="text-sm text-brand-deep/60">No notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notes.map((note, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border-2 border-brand-deep/20 p-3 text-sm"
                  >
                    {note.createdAt ? (
                      <p className="text-xs font-bold text-brand-deep/50">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(note.createdAt))}
                      </p>
                    ) : null}
                    <p className="mt-0.5 whitespace-pre-wrap text-brand-deep/80">{note.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-brand-deep/50">
              Replies happen over email — this thread is the parent&rsquo;s side only.
            </p>
          </section>
        </div>

        {/* ── Right: the work ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <WorkflowCard
            orderId={String(order.id)}
            status={status}
            statusLabel={STATUS_CHIPS[status].label}
            nextSteps={NEXT_STEPS[status]}
            allStatuses={[...ALL_STATUSES]}
            statusLabels={Object.fromEntries(
              ALL_STATUSES.map((s) => [s, STATUS_CHIPS[s].label]),
            )}
          />

          <PromisedByEditor
            orderId={String(order.id)}
            promisedBy={(order.promisedBy as string | null) ?? null}
          />

          {/* Video upload slots mount here in the uploads task: */}
          <VideoSlotPlaceholder title="Preview film" media={proof} />
          <VideoSlotPlaceholder title="Final film" media={finalVideo} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-cream p-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-brand-deep/50">{label}</dt>
      <dd className="mt-0.5 font-bold text-brand-deep">{value}</dd>
    </div>
  );
}

/** Read-only slot until the uploads task replaces it with VideoUpload. */
function VideoSlotPlaceholder({ title, media }: { title: string; media: MediaDoc | null }) {
  return (
    <section
      aria-label={title}
      className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
    >
      <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        {title}
      </h2>
      {media ? (
        <p className="mt-2 text-sm text-brand-deep/70">
          {media.filename ?? "attached"} — uploads move here in the next task.
        </p>
      ) : (
        <p className="mt-2 text-sm text-brand-deep/60">Nothing attached yet.</p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Typecheck + run the studio test folder**

Run: `npx tsc --noEmit && npx vitest run tests/studio/`
Expected: clean / PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/studio/(gated)/orders/[id]/page.tsx" components/studio/workflow-card.tsx components/studio/promised-by-editor.tsx
git commit -m "feat(studio): order workstation — story, photos, notes, workflow, promise"
```

---

### Task 11: Video uploads — browser → Blob, attach action, local fallback — TDD

**Files:**
- Modify: `payload.config.ts:60-64` (add `clientUploads: true`)
- Modify: `collections/Media.ts:33-35` (add `filesRequiredOnCreate: false`)
- Create: `app/studio/api/blob-upload/route.ts`
- Modify: `lib/studio-actions.ts` (add `attachUploadedVideo` + `uploadVideoDirect`)
- Create: `components/studio/video-upload.tsx`
- Modify: `app/studio/(gated)/orders/[id]/page.tsx` (replace `VideoSlotPlaceholder` with `VideoUpload`)
- Test: `tests/studio/attach-video.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
/**
 * Metadata-only media creation + attach core — DB-backed.
 * Proves upload.filesRequiredOnCreate: false lets the studio register a blob
 * that was uploaded client-side (no file buffer through the server), and that
 * attachVideoCore links it to the right order slot.
 */
import { describe, expect, test } from "vitest";

import { attachVideoCore } from "@/lib/studio-actions";
import { getPayloadClient } from "@/lib/payload";

async function seedOrder() {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: {
      email: `attach-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      emailVerified: true,
    },
    overrideAccess: true,
  });
  const order = await payload.create({
    collection: "orders",
    data: { owner: user.id, status: "in_production", childName: "Clip" },
    overrideAccess: true,
  });
  return { payload, order };
}

describe("attachVideoCore", () => {
  test("creates a metadata-only media doc and links it as the proof", async () => {
    const { payload, order } = await seedOrder();
    const pathname = `${order.id}-proof-${Date.now()}.mp4`;

    const result = await attachVideoCore({
      orderId: String(order.id),
      kind: "proof",
      blob: { pathname, contentType: "video/mp4", size: 1234567 },
    });
    expect(result).toEqual({ ok: true });

    const fresh = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 1,
      overrideAccess: true,
    });
    const proof = fresh.proof as { filename?: string; mimeType?: string; filesize?: number };
    expect(proof?.filename).toBe(pathname);
    expect(proof?.mimeType).toBe("video/mp4");
    expect(proof?.filesize).toBe(1234567);
  });

  test("rejects non-video content types", async () => {
    const { order } = await seedOrder();
    const result = await attachVideoCore({
      orderId: String(order.id),
      kind: "finalVideo",
      blob: { pathname: "x.txt", contentType: "text/plain", size: 10 },
    });
    expect(result.ok).toBe(false);
  });

  test("rejects an unknown kind", async () => {
    const { order } = await seedOrder();
    const result = await attachVideoCore({
      orderId: String(order.id),
      // @ts-expect-error — deliberately invalid
      kind: "assets",
      blob: { pathname: "x.mp4", contentType: "video/mp4", size: 10 },
    });
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/studio/attach-video.test.ts`
Expected: FAIL — `attachVideoCore` is not exported.

- [ ] **Step 3: Config changes**

`payload.config.ts` — the plugin block becomes (comment updated to mention both modes):

```ts
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
      // Admin-panel uploads go browser → Blob directly (bypasses Vercel's
      // ~4.5MB request cap — final films are hundreds of MB). The /studio
      // panel has its own client-upload route for the same reason.
      clientUploads: true,
    }),
```

`collections/Media.ts` — the upload block becomes:

```ts
  upload: {
    staticDir: path.resolve(dirname, "../media"),
    // The studio panel uploads big videos straight to Vercel Blob from the
    // browser, then registers the blob here as a metadata-only doc (filename
    // == blob pathname). Payload must therefore allow file-less creates.
    filesRequiredOnCreate: false,
  },
```

- [ ] **Step 4: Token route `app/studio/api/blob-upload/route.ts`**

```ts
/**
 * POST /studio/api/blob-upload — mints short-lived client-upload tokens so the
 * studio's browser can stream big video files STRAIGHT to Vercel Blob (the
 * server never sees the bytes; Vercel caps request bodies at ~4.5MB).
 *
 * SECURITY: route handlers do NOT inherit the (gated) layout — the admin check
 * happens inside onBeforeGenerateToken, before any token is signed.
 *
 * NOTE: no onUploadCompleted — it does not fire on localhost. The client calls
 * the attachUploadedVideo action itself after the upload finishes.
 */
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getStudioUser } from "@/lib/studio-auth";

const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getStudioUser();
        if (!user) {
          throw new Error("You need to be signed in to the studio to upload.");
        }
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-matroska",
          ],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload could not start.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 5: Attach + direct-upload actions in `lib/studio-actions.ts`**

Add imports at the top of the file:

```ts
import { isBlobStorageEnabled } from "@/lib/video-access";
```

Append:

```ts
export type VideoKind = "proof" | "finalVideo";

interface BlobMeta {
  pathname: string;
  contentType: string;
  size: number;
}

/**
 * Core: register an already-uploaded blob as a media doc (metadata only —
 * the bytes are in Vercel Blob; filename == blob pathname is what the video
 * proxy's head(filename) resolves) and link it to the order's proof/finalVideo.
 */
export async function attachVideoCore(args: {
  orderId: string;
  kind: VideoKind;
  blob: BlobMeta;
}): Promise<StudioActionResult> {
  const { orderId, kind, blob } = args;
  if (kind !== "proof" && kind !== "finalVideo") {
    return { ok: false, error: "Unknown video slot." };
  }
  if (!blob.contentType.startsWith("video/")) {
    return { ok: false, error: "That file is not a video." };
  }

  const payload = await getPayloadClient();
  try {
    await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    return { ok: false, error: "We could not find that order." };
  }

  const media = await payload.create({
    collection: "media",
    data: {
      filename: blob.pathname,
      mimeType: blob.contentType,
      filesize: blob.size,
    },
    overrideAccess: true,
  });

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { [kind]: media.id },
    overrideAccess: true,
  });
  return { ok: true };
}

/**
 * Action: after the browser finishes a direct-to-Blob upload, verify the blob
 * really exists (head by pathname — same resolution the playback proxy uses)
 * and attach it. Replacing simply links a new media doc; the old blob stays
 * orphaned and invisible (cleanup is a filed tech-debt note).
 */
export async function attachUploadedVideo(args: {
  orderId: string;
  kind: VideoKind;
  pathname: string;
}): Promise<StudioActionResult> {
  await requireStudioUser();
  try {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blob;
    try {
      blob = await head(args.pathname);
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return {
          ok: false,
          error: "We could not find that upload. Please try again.",
        };
      }
      throw err;
    }
    const result = await attachVideoCore({
      orderId: args.orderId,
      kind: args.kind,
      blob: {
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: blob.size,
      },
    });
    if (result.ok) revalidateStudioAndCustomer(args.orderId);
    return result;
  } catch (err) {
    console.error("[studio] attachUploadedVideo failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Action: dev fallback when no Blob token is configured — a plain server-side
 * upload into Payload's local-disk media storage. Local only: no request-body
 * cap applies off Vercel. Mirrors the dual-path convention in lib/video-access.
 */
export async function uploadVideoDirect(
  orderId: string,
  kind: VideoKind,
  formData: FormData,
): Promise<StudioActionResult> {
  await requireStudioUser();
  if (isBlobStorageEnabled()) {
    return {
      ok: false,
      error: "Direct upload is a local-dev fallback. Use the browser upload.",
    };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a video file." };
  }
  if (!file.type.startsWith("video/")) {
    return { ok: false, error: "That file is not a video." };
  }

  try {
    const payload = await getPayloadClient();
    const media = await payload.create({
      collection: "media",
      data: {},
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        name: file.name,
        mimetype: file.type,
        size: file.size,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { [kind]: media.id },
      overrideAccess: true,
    });
    revalidateStudioAndCustomer(orderId);
    return { ok: true };
  } catch (err) {
    console.error("[studio] uploadVideoDirect failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
```

- [ ] **Step 6: Run the attach test**

Run: `npx vitest run tests/studio/attach-video.test.ts`
Expected: PASS — this is also the live proof that `filesRequiredOnCreate: false` behaves as the vendored source says. If Payload still throws MissingFile here, STOP and check the option landed in `collections/Media.ts` (spec fallback: a dedicated `videos` collection).

- [ ] **Step 7: `components/studio/video-upload.tsx`**

```tsx
"use client";

/**
 * VideoUpload — one slot (proof or final film).
 *
 * Blob mode (token set): browser → Vercel Blob via @vercel/blob/client upload()
 * with a token minted by /studio/api/blob-upload, then attachUploadedVideo
 * registers + links it. The server never carries the bytes.
 * Local-dev mode: a plain server-action upload (no body cap off Vercel).
 *
 * Unique pathname per attempt (orderId-kind-timestamp.ext) — retries can never
 * collide; replaced videos just relink (old blobs stay orphaned, see tech-debt).
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

import { attachUploadedVideo, uploadVideoDirect } from "@/lib/studio-actions";
import type { VideoKind } from "@/lib/studio-actions";

export function VideoUpload({
  orderId,
  kind,
  title,
  hint,
  blobEnabled,
  current,
}: {
  orderId: string;
  kind: VideoKind;
  title: string;
  hint?: string;
  blobEnabled: boolean;
  current: { filename: string | null; url: string | null } | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "uploading"; percent: number }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  async function handleFile(file: File) {
    setState({ phase: "uploading", percent: 0 });
    try {
      if (blobEnabled) {
        const ext = file.name.includes(".")
          ? file.name.split(".").pop()
          : "mp4";
        const pathname = `${orderId}-${kind === "proof" ? "proof" : "final"}-${Date.now()}.${ext}`;
        await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/studio/api/blob-upload",
          onUploadProgress: ({ percentage }) =>
            setState({ phase: "uploading", percent: Math.round(percentage) }),
        });
        const result = await attachUploadedVideo({ orderId, kind, pathname });
        if (!result.ok) {
          setState({ phase: "error", message: result.error });
          return;
        }
      } else {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadVideoDirect(orderId, kind, formData);
        if (!result.ok) {
          setState({ phase: "error", message: result.error });
          return;
        }
      }
      setState({ phase: "idle" });
      router.refresh();
    } catch (err) {
      console.error("[studio] upload failed:", err);
      setState({
        phase: "error",
        message: "The upload did not finish. Please try again.",
      });
    }
  }

  return (
    <section
      aria-label={title}
      className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
    >
      <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        {title}
      </h2>

      {current?.filename ? (
        <p className="mt-2 break-all text-sm text-brand-deep/70">
          <span className="font-bold">{current.filename}</span>
          {current.url ? (
            <>
              {" · "}
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${title.toLowerCase()} (opens in a new tab)`}
                className="underline-offset-4 hover:underline"
              >
                open ↗
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-brand-deep/60">Nothing attached yet.</p>
      )}
      {hint ? <p className="mt-1 text-xs text-brand-deep/50">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="mt-3">
        {state.phase === "uploading" ? (
          <div>
            <div className="h-3 overflow-hidden rounded-full border-2 border-brand-deep bg-brand-cream">
              <div
                className="h-full bg-brand-blue transition-[width]"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <p role="status" className="mt-1 text-xs font-semibold text-brand-deep/60">
              Uploading... {state.percent}%
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border-2 border-brand-deep bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {current?.filename ? "Replace the film" : "Upload a film"}
          </button>
        )}
      </div>

      {state.phase === "error" ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-brand-pink">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 8: Mount the slots in the workstation page**

In `app/studio/(gated)/orders/[id]/page.tsx`: delete `VideoSlotPlaceholder` (the component and both call sites), add imports:

```tsx
import { VideoUpload } from "@/components/studio/video-upload";
import { isBlobStorageEnabled } from "@/lib/video-access";
```

and render in their place:

```tsx
          <VideoUpload
            orderId={String(order.id)}
            kind="proof"
            title="Preview film"
            hint="Sharing the proof emails the parent automatically."
            blobEnabled={isBlobStorageEnabled()}
            current={proof ? { filename: proof.filename ?? null, url: proof.url ?? null } : null}
          />
          <VideoUpload
            orderId={String(order.id)}
            kind="finalVideo"
            title="Final film"
            hint="Marking the order delivered emails the parent automatically."
            blobEnabled={isBlobStorageEnabled()}
            current={
              finalVideo
                ? { filename: finalVideo.filename ?? null, url: finalVideo.url ?? null }
                : null
            }
          />
```

- [ ] **Step 9: Full verification**

Run: `npx tsc --noEmit && npx vitest run tests/studio/ tests/app/ tests/payload/`
Expected: clean / PASS (tests/payload/collections.test.ts confirms the Media config still boots).

- [ ] **Step 10: Commit**

```bash
git add payload.config.ts collections/Media.ts app/studio/api lib/studio-actions.ts components/studio/video-upload.tsx "app/studio/(gated)/orders/[id]/page.tsx" tests/studio/attach-video.test.ts
git commit -m "feat(studio): browser-to-Blob video uploads with metadata-only media attach"
```

---

### Task 12: Fix customer proof playback (spec addendum) — TDD

`ProofReview` plays `proof.url` — the adminOnly-gated `/api/media/file/*` endpoint, which 403s for real parents. Serve the proof through the ownership-gated video route instead.

**Files:**
- Modify: `lib/video-access.ts:57-90` (`resolveOwnedVideo` gains a field param)
- Modify: `app/(app)/api/orders/[id]/video/route.ts:43-45` (accept `?kind=proof`)
- Modify: `app/(app)/app/orders/[id]/page.tsx:38-52,73` (pass the gated URL down)
- Modify: `components/app/proof-review.tsx` (play the gated URL)
- Test: `tests/app/video-access.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

Append to `tests/app/video-access.test.ts` (follow the file's existing seeding helpers — it already creates owner + order + media for the finalVideo case; mirror that for proof):

```ts
test("resolveOwnedVideo can resolve the proof field for the owner", async () => {
  const payload = await getPayloadClient();
  const owner = await payload.create({
    collection: "users",
    data: {
      email: `proof-access-${Date.now()}@example.com`,
      emailVerified: true,
    },
    overrideAccess: true,
  });
  const media = await payload.create({
    collection: "media",
    data: { alt: "proof clip" },
    file: {
      data: Buffer.from("proof-bytes"),
      name: `proof-${Date.now()}.mp4`,
      mimetype: "video/mp4",
      size: 11,
    },
    overrideAccess: true,
  });
  const order = await payload.create({
    collection: "orders",
    data: { owner: owner.id, status: "proof_ready", proof: media.id },
    overrideAccess: true,
  });

  mockSessionUser(String(owner.id)); // use this file's existing session-mocking helper

  const resolved = await resolveOwnedVideo(String(order.id), "proof");
  expect(resolved?.mimeType).toBe("video/mp4");
  expect(resolved?.filename).toBe(media.filename);

  // The default field remains finalVideo — and this order has none.
  expect(await resolveOwnedVideo(String(order.id))).toBeNull();
});
```

(If the existing file mocks sessions differently — e.g. via `vi.mock("@/lib/customer-data")` — copy its exact mechanism; the assertion block is what matters.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/app/video-access.test.ts`
Expected: new test FAILS (resolveOwnedVideo takes one argument).

- [ ] **Step 3: Implement**

`lib/video-access.ts` — generalize (docstring updated to mention both fields):

```ts
export async function resolveOwnedVideo(
  orderId: string,
  field: "finalVideo" | "proof" = "finalVideo",
): Promise<OwnedVideo | null> {
  const { order, payload } = await assertOwnsOrder(orderId);

  // owner is normalized inside assertOwnsOrder; the relation is an id at depth 0.
  const value = (order as Record<string, unknown>)[field];
  const mediaId =
    typeof value === "object" && value !== null
      ? String((value as { id: string }).id)
      : value
        ? String(value)
        : null;

  if (!mediaId) return null;
  // ... rest of the function is unchanged ...
```

`app/(app)/api/orders/[id]/video/route.ts` — where the handler currently calls `resolveOwnedVideo(id)`, read the kind from the query first:

```ts
  // ?kind=proof streams the preview film through the same ownership gate;
  // anything else (or nothing) streams the delivered final film.
  const kind =
    req.nextUrl.searchParams.get("kind") === "proof" ? "proof" : "finalVideo";

  let video;
  try {
    video = await resolveOwnedVideo(id, kind);
```

`app/(app)/app/orders/[id]/page.tsx` — `loadProof` no longer leaks the adminOnly URL; replace its return with the gated route URL:

```ts
async function loadProof(
  orderId: string,
  proofId?: string | null,
): Promise<ProofMedia | null> {
  if (!proofId) return null;
  try {
    const payload = await getPayloadClient();
    const media = await payload.findByID({
      collection: "media",
      id: proofId,
      depth: 0,
      overrideAccess: true,
    });
    return {
      // The ownership-gated route — NOT media.url, whose adminOnly read 403s
      // for parents (spec addendum, 2026-06-10).
      url: `/api/orders/${orderId}/video?kind=proof`,
      mimeType: media.mimeType ?? null,
      alt: media.alt ?? null,
    };
  } catch {
    return null;
  }
}
```

and update its call site:

```ts
  const proof =
    status === "proof_ready"
      ? await loadProof(String(order.id), order.proof as string | null)
      : null;
```

`components/app/proof-review.tsx` needs no structural change — it already renders `proof.url`; confirm nothing else in it dereferences media-specific URL shapes.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/app/`
Expected: PASS, including all pre-existing video-access tests (default field unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/video-access.ts "app/(app)/api/orders/[id]/video/route.ts" "app/(app)/app/orders/[id]/page.tsx" components/app/proof-review.tsx tests/app/video-access.test.ts
git commit -m "fix(app): proof playback goes through the ownership-gated route (was 403 for parents)"
```

---

### Task 13: Customer delivery countdown + mascot

**Files:**
- Create: `components/app/mascot-image.tsx` (client, reduced-motion aware)
- Create: `components/app/delivery-countdown.tsx` (server)
- Modify: `app/(app)/app/orders/[id]/page.tsx` (mount it)

- [ ] **Step 1: `components/app/mascot-image.tsx`**

```tsx
"use client";

/**
 * MascotImage — the animated builder, politely. Renders the static frame by
 * default (matching the server render — no hydration flash) and swaps in the
 * animated WebP only when the visitor does NOT prefer reduced motion.
 * Plain <img>: Next's optimizer would serve the animated file unanimated.
 */
import { useEffect, useState } from "react";

export function MascotImage({
  animatedSrc,
  staticSrc,
  width,
  height,
  className,
}: {
  animatedSrc: string;
  staticSrc: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [src, setSrc] = useState(staticSrc);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setSrc(query.matches ? staticSrc : animatedSrc);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [animatedSrc, staticSrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated webp
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
```

- [ ] **Step 2: `components/app/delivery-countdown.tsx`**

```tsx
/**
 * DeliveryCountdown — the parent's calm ETA card (server component).
 *
 * Days granularity, never negative numbers, hidden when there is no promise
 * and once the film is delivered (countdownState owns those rules and is
 * unit-tested). The ring fills as the production window elapses. Copy per the
 * brand-voice guide: sentence case, no em-dashes, no alarm.
 */
import { countdownState, formatPromisedDate } from "@/lib/delivery";
import { MascotImage } from "@/components/app/mascot-image";
import type { OrderStatus } from "@/lib/order-stages";

const RING_RADIUS = 32;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 201

export function DeliveryCountdown({
  status,
  promisedBy,
  createdAt,
  childName,
}: {
  status: OrderStatus;
  promisedBy: string | null;
  createdAt: string;
  childName?: string;
}) {
  const state = countdownState({
    status,
    promisedBy,
    createdAt,
    now: new Date(),
  });
  if (state.kind === "hidden") return null;

  const heading = childName
    ? `${childName}'s film is on its way`
    : "Your film is on its way";

  return (
    <div className="mt-6 flex items-center gap-5 rounded-2xl border-2 border-brand-deep bg-white p-5">
      {state.kind === "overdue" ? (
        <MascotImage
          animatedSrc="/mascot/builder-240.webp"
          staticSrc="/mascot/builder-static.png"
          width={72}
          height={72}
          className="h-[72px] w-auto shrink-0"
        />
      ) : (
        <svg
          width="76"
          height="76"
          viewBox="0 0 76 76"
          role="img"
          aria-label={
            state.kind === "soon"
              ? "Ready very soon"
              : `${state.days} days to go`
          }
          className="shrink-0"
        >
          <circle
            cx="38"
            cy="38"
            r={RING_RADIUS}
            fill="var(--color-brand-cream)"
            stroke="rgba(26,16,51,0.15)"
            strokeWidth="6"
          />
          <circle
            cx="38"
            cy="38"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-brand-blue)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={
              state.kind === "soon"
                ? RING_CIRCUMFERENCE * 0.04
                : RING_CIRCUMFERENCE * (1 - state.fractionElapsed)
            }
            transform="rotate(-90 38 38)"
          />
          <text
            x="38"
            y={state.kind === "soon" ? 43 : 36}
            textAnchor="middle"
            fill="var(--color-brand-deep)"
            style={{ fontFamily: "var(--font-fredoka)", fontSize: state.kind === "soon" ? 13 : 19 }}
          >
            {state.kind === "soon" ? "soon" : state.days}
          </text>
          {state.kind === "counting" ? (
            <text
              x="38"
              y="50"
              textAnchor="middle"
              fill="var(--color-brand-deep)"
              opacity="0.6"
              style={{ fontFamily: "var(--font-quicksand)", fontSize: 9, fontWeight: 700 }}
            >
              days
            </text>
          ) : null}
        </svg>
      )}

      <div style={{ fontFamily: "var(--font-quicksand)" }}>
        {state.kind === "overdue" ? (
          <>
            <p className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Nearly finished
            </p>
            <p className="mt-0.5 text-sm text-brand-deep/70">
              The final touches are taking a little longer than we hoped. It
              will be worth the wait.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              {heading}
            </p>
            <p className="mt-0.5 text-sm text-brand-deep/70">
              {state.kind === "soon"
                ? "It should be ready very soon."
                : `We expect it ready by ${formatPromisedDate(state.promisedBy)}.`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Mount on the customer order page**

In `app/(app)/app/orders/[id]/page.tsx`, import:

```tsx
import { DeliveryCountdown } from "@/components/app/delivery-countdown";
```

and render directly after the status-message `<div className="rounded-2xl border-2 ...">` block (inside the `<article>`, before `<ActionSlot ... />`):

```tsx
        <DeliveryCountdown
          status={status}
          promisedBy={(order.promisedBy as string | null) ?? null}
          createdAt={String(order.createdAt)}
          childName={childName}
        />
```

- [ ] **Step 4: Typecheck + customer-area tests**

Run: `npx tsc --noEmit && npx vitest run tests/app/ tests/lib/delivery.test.ts`
Expected: clean / PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app/mascot-image.tsx components/app/delivery-countdown.tsx "app/(app)/app/orders/[id]/page.tsx"
git commit -m "feat(app): delivery countdown ring with the builder mascot"
```

---

### Task 14: Playwright Layer B — studio flow

**Files:**
- Modify: `e2e/fixtures/seed.ts` (add `seedAdmin`)
- Modify: `e2e/fixtures/seed.runner.ts` (admin mode)
- Create: `e2e/studio.spec.ts`

- [ ] **Step 1: `seedAdmin` in `e2e/fixtures/seed.ts`**

```ts
export async function seedAdmin(email: string, password: string) {
  const p = await getPayloadClient();
  const found = await p.find({
    collection: "admins",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  if (found.totalDocs > 0) return found.docs[0];
  return p.create({
    collection: "admins",
    data: { email, password, name: "E2E Studio Admin" },
    overrideAccess: true,
  });
}
```

- [ ] **Step 2: Admin mode in `e2e/fixtures/seed.runner.ts`**

Add the import and, inside the existing `test("seed the e2e customer", ...)` body (after the order block):

```ts
import { seedCustomer, seedOrder, seedAdmin } from "./seed";
```

```ts
  const adminEmail = process.env.E2E_SEED_ADMIN_EMAIL;
  const adminPassword = process.env.E2E_SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const admin = await seedAdmin(adminEmail, adminPassword);
    console.log(`[seed.runner] seeded admin ${admin.id} <${adminEmail}>`);
  }
```

- [ ] **Step 3: `e2e/studio.spec.ts`**

```ts
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Layer B — the studio panel. Same out-of-process seeding as dashboard.spec.ts
 * (Payload's config cannot be imported into a Playwright spec). The chromium
 * project carries the CUSTOMER storageState; the studio gate must treat that
 * as signed-out, which the first test pins down. We then sign in as the seeded
 * admin through the real form.
 */
const ADMIN_EMAIL = "e2e-studio-admin@example.com";
const ADMIN_PASSWORD = "e2e-studio-password-1234";

function seedStudio(status: string, child: string) {
  execFileSync(
    "node",
    [
      "--env-file=.env.test",
      "./node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "e2e/fixtures/seed.vitest.config.ts",
    ],
    {
      env: {
        ...process.env,
        E2E_SEED_EMAIL: "e2e-customer@example.com",
        E2E_SEED_STATUS: status,
        E2E_SEED_CHILD: child,
        E2E_SEED_ADMIN_EMAIL: ADMIN_EMAIL,
        E2E_SEED_ADMIN_PASSWORD: ADMIN_PASSWORD,
      },
      stdio: "inherit",
    },
  );
}

test("@layerB the studio gate bounces a customer session to sign-in", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/studio\/sign-in/);
});

test("@layerB studio: sign in, find the order in the queue, advance it", async ({
  page,
}) => {
  seedStudio("paid", "Zelie");

  await page.goto("/studio/sign-in");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText("Needs your attention")).toBeVisible();

  // Open the seeded order from the attention queue.
  await page.getByRole("link").filter({ hasText: "Zelie" }).first().click();
  await expect(page).toHaveURL(/\/studio\/orders\//);
  await expect(page.getByText("The story they ordered")).toBeVisible();

  // Advance paid → in_production via the primary next-step button.
  await page.getByRole("button", { name: "Start production" }).click();
  await expect(page.getByText("In production").first()).toBeVisible();
});
```

- [ ] **Step 4: Run Layer A+B locally if a test DB is available**

Run: `npm run test:e2e`
Expected: all specs pass, including the two new @layerB studio tests. (No DB in the sandbox → defer to CI, as the suite header documents.)

- [ ] **Step 5: Commit**

```bash
git add e2e/fixtures/seed.ts e2e/fixtures/seed.runner.ts e2e/studio.spec.ts
git commit -m "test(e2e): studio Layer B — gate bounce, sign-in, queue, status advance"
```

---

### Task 15: Mind maintenance, docs, final verification

**Files:**
- Create: `fairy-tale-mind/map/zones/studio.md`
- Modify: zone cards `checkout.md`, `auth-gating.md`, `payload-backend.md`, `app-shell.md` (re-stamp `verifiedAt` to the branch HEAD; note the deltas below)
- Create: `fairy-tale-mind/map/decisions/` records (3)
- Create: `fairy-tale-mind/tech-debt/orphaned-blobs-no-cleanup.md`
- Modify: `README.md` (one line), `fairy-tale-mind/map/index.md` (regenerated)

- [ ] **Step 1: New zone card `fairy-tale-mind/map/zones/studio.md`**

Follow the exact frontmatter shape of an existing zone card (open `fairy-tale-mind/map/zones/auth-gating.md` and mirror its fields). Content requirements:
- Summary: the staff panel — dashboard (revenue, attention queue), order workstation (status workflow + guardrails, delivery promise, browser-to-Blob uploads), gated by the Payload admins login.
- Sources: `app/studio/**`, `lib/studio-auth.ts`, `lib/studio-workflow.ts`, `lib/studio-actions.ts`, `lib/studio-data.ts`, `lib/delivery.ts`, `components/studio/**`.
- Invariants (with enforcedBy where tests exist):
  - "Every studio mutation begins with requireStudioUser; the UI is never the security boundary." → tests/studio/auth.test.ts
  - "proof_ready requires a proof; delivered requires the final film — server-enforced." → tests/studio/actions.test.ts
  - "Video bytes never pass through the server in Blob mode; pathname == filename is what the playback proxy resolves." → tests/studio/attach-video.test.ts
  - "Revenue sums Stripe-charged cents, excluding refunded/cancelled; never recomputed from pricing." → tests/studio/workflow.test.ts

- [ ] **Step 2: Re-stamp + delta the touched zones**

- `checkout.md`: webhook now stamps amountTotalCents + promisedBy and emails the expected-by line.
- `auth-gating.md`: customer order page gained the DeliveryCountdown; proof playback now goes through the gated video route (`?kind=proof`) — the adminOnly media URL leak is fixed.
- `payload-backend.md`: Media allows metadata-only creates (filesRequiredOnCreate: false); blob plugin has clientUploads: true; new migration 20260610_000001.
- `app-shell.md`: robots disallow gained /studio.
- Set each card's `verifiedAt` to the current HEAD commit hash.

- [ ] **Step 3: Decision records** (past tense, one file each, follow an existing record's format)

1. `studio-gate-reuses-payload-admins-auth.md` — why: no new auth system for 2 people; payload.auth resolves the /admin cookie; customer cookies can never pass. Alternative rejected: separate Better Auth instance / roles.
2. `browser-to-blob-uploads-metadata-media.md` — why: ~4.5MB Vercel body cap vs hundred-MB films; client token route + filesRequiredOnCreate: false attach; onUploadCompleted rejected (no localhost delivery); fallback /admin clientUploads.
3. `delivery-promise-auto-from-length.md` — why: every order promises from minute one (7/14/21 days), studio overrides per order; overdue shows a calm variant, never negative numbers.

- [ ] **Step 4: Tech-debt note `orphaned-blobs-no-cleanup.md`**

Replaced/abandoned uploads leave orphaned blobs in Vercel Blob (invisible, harmless, costs pennies). Cleanup = list blobs not referenced by any media doc; defer until volume justifies it.

- [ ] **Step 5: README — add the studio to the tour**

In `README.md` after the `/admin` sentence (line 19-21), add:

```markdown
The staff order panel lives at `/studio` (same `admins` login as `/admin`):
revenue, the order queue, status workflow, video delivery, and the customer's
delivery promise.
```

- [ ] **Step 6: Regenerate the Mind index + full local verification**

```bash
npm run mind
npx tsc --noEmit
npx vitest run
```

Expected: index regenerated with the new zone (16 zones); typecheck clean; vitest green (DB-backed files need the test DB — in a DB-less sandbox run the non-DB subset and lean on CI).

- [ ] **Step 7: Commit**

```bash
git add fairy-tale-mind README.md
git commit -m "docs(mind): studio zone, decisions, debt notes; README mentions /studio"
```

---

## Post-implementation checklist (user-facing, not tasks)

1. **Vercel:** nothing new to configure — `BLOB_READ_WRITE_TOKEN` and the rest are already in the fail-closed env list. `clientUploads` uses the same token.
2. **Preview-deploy verification:** sign in at `/studio/sign-in`; upload a >10MB video to a test order (watch the progress bar — bytes must NOT hit the server); play the proof as the OWNING customer (the `?kind=proof` route); check the countdown card renders; confirm a non-admin (customer session) gets bounced from `/studio`.
3. **Stripe:** place one test-mode order and confirm the order shows its real amount and a promise date in the dashboard.
4. **Tune `PRODUCTION_DAYS`** in `lib/delivery.ts` once real production pace is known.

## Self-review notes (already applied)

- Spec coverage: every spec section maps to a task (routes/gate → 4+7; data → 2+3; dashboard → 8; list → 9; workstation → 10; uploads → 11; proof addendum → 12; countdown + mascot → 0+13; testing → per-task + 14; Mind → 15).
- Out of scope (unchanged from spec): note replies, charts, partial refunds, staff new-order notifications, list search.
- Type consistency: `StudioOrder`, `StudioActionResult`, `VideoKind`, `CountdownState` are each defined once and imported elsewhere; `applyOrderStatusCore`/`applyPromisedByCore`/`attachVideoCore` names match between Tasks 6, 11 and their tests.
