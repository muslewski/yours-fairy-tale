# In-Studio Live Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a calm "In the studio now" hero card — the auto-playing builder mascot perched at sign-in scale beside a live count-up "crafting for 2d 06h 14m 32s" clock and the ready-by date — on order detail pages whose status is `in_production` or `revisions`.

**Architecture:** Two pure, unit-tested libs (`lib/studio-elapsed.ts` for elapsed math + formatting; `lib/in-studio-stamp.ts` for the "stamp the start time once" decision) feed a thin client component (`components/app/studio-live-card.tsx`) that reuses the existing `MascotImage` and `lib/delivery.ts`. A new `inStudioSince` order field is stamped at the three sites where an order first enters production. The order detail page swaps the new card in for `in_production`/`revisions` and leaves `DeliveryCountdown` for every other status.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Tailwind v4, Motion (`motion/react`), Payload v3 on Postgres/Neon, Vitest (node env).

**Source spec:** `fairy-tale-mind/specs/2026-06-16-in-studio-live-card-design.md`

---

## File Structure

**Create:**
- `lib/studio-elapsed.ts` — pure elapsed-time math + display formatting (`studioElapsed`, `formatStudioElapsed`, `formatStudioElapsedCoarse`, `formatStudioSince`). No React, no DB.
- `lib/in-studio-stamp.ts` — pure decision: given `nextStatus` + the order's current `inStudioSince`, return the partial update that stamps the start time once (or `{}`).
- `components/app/studio-live-card.tsx` — the client hero card. Composes `MascotImage` + the two pure libs + `lib/delivery.ts`.
- `migrations/20260616_000001_order_in_studio_since.ts` — additive column migration for prod.
- `tests/lib/studio-elapsed.test.ts`, `tests/lib/in-studio-stamp.test.ts` — unit tests (written first).
- `fairy-tale-mind/map/decisions/2026-06-16-in-studio-live-card.md` — decision record.

**Modify:**
- `collections/Orders.ts` — add the `inStudioSince` date field.
- `migrations/index.ts` — register the new migration.
- `app/api/stripe/webhook/route.ts` — stamp `inStudioSince` when photos attach at checkout.
- `lib/order-action-cores.ts` — stamp on the customer upload auto-advance.
- `lib/studio-order-mutations.ts` — stamp on the studio status transition.
- `lib/order-stages.ts` — `export` the existing `heroName` helper.
- `app/(site)/(app)/app/orders/[id]/page.tsx` — render `StudioLiveCard` for `in_production`/`revisions`.
- `tests/stripe/webhook.test.ts`, `tests/studio/actions.test.ts` — DB-backed confirmations of the stamp.
- `fairy-tale-mind/map/zones/auth-gating.md` — re-stamp + add sources.

**Test command:** `npm test` (= `vitest run`). Single file: `npx vitest run <path>`.

---

## Task 1: `inStudioSince` order field + migration

Foundation only — no standalone unit test (a Payload field has no isolated logic; its behavior is covered by Task 4's stamp tests). The field must exist in the config so dev/test DBs get the column via Payload schema-push, and the migration adds it to prod.

**Files:**
- Modify: `collections/Orders.ts:213-221`
- Create: `migrations/20260616_000001_order_in_studio_since.ts`
- Modify: `migrations/index.ts`

- [ ] **Step 1: Add the field to the Orders collection**

In `collections/Orders.ts`, immediately AFTER the `promisedBy` field object (which ends at line 221 with `},`) and before the closing `],` of `fields`, insert:

```ts
    {
      name: "inStudioSince",
      type: "date",
      admin: {
        readOnly: true,
        description:
          "When the order first entered production (status → in_production). " +
          "Stamped once by the system; drives the customer's 'in the studio for …' " +
          "live clock. Never reset on re-entry.",
      },
    },
```

- [ ] **Step 2: Create the migration**

Create `migrations/20260616_000001_order_in_studio_since.ts` (mirrors `migrations/20260610_000001_order_amount_promise.ts` — same `timestamp(3) with time zone` type Payload uses for date fields):

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds orders.in_studio_since (date → timestamptz): the moment an order first
 * entered production, stamped once by the app. Drives the customer dashboard's
 * "in the studio for …" live clock (lib/studio-elapsed.ts). Additive and
 * idempotent (IF NOT EXISTS); safe against a dev-pushed schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "in_studio_since" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "in_studio_since";
  `);
}
```

- [ ] **Step 3: Register the migration**

In `migrations/index.ts`, add the import after line 6:

```ts
import * as migration_20260616_000001_order_in_studio_since from "./20260616_000001_order_in_studio_since";
```

and add this object as the LAST entry of the `migrations` array (after the `20260616_000000_locked_docs_rels_waitlist_sitemedia` entry, keeping chronological order):

```ts
  {
    up: migration_20260616_000001_order_in_studio_since.up,
    down: migration_20260616_000001_order_in_studio_since.down,
    name: "20260616_000001_order_in_studio_since",
  },
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors). The field is additive; nothing else references it yet.

- [ ] **Step 5: Commit**

```bash
git add collections/Orders.ts migrations/20260616_000001_order_in_studio_since.ts migrations/index.ts
git commit -m "feat(orders): add inStudioSince field + migration (production start stamp)"
```

> Note: do NOT run the migration by hand against prod. Prod applies it via migrate-on-boot on the next deploy; dev/test get the column via Payload schema-push when the config loads.

---

## Task 2: `lib/studio-elapsed.ts` — elapsed math + formatting (TDD)

**Files:**
- Create: `tests/lib/studio-elapsed.test.ts`
- Create: `lib/studio-elapsed.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/studio-elapsed.test.ts`:

```ts
/**
 * Studio-elapsed — pure count-up math + display formatting. No DB, no DOM.
 */
import { describe, expect, test } from "vitest";

import {
  studioElapsed,
  formatStudioElapsed,
  formatStudioElapsedCoarse,
  formatStudioSince,
} from "@/lib/studio-elapsed";

const START = "2026-06-14T10:00:00.000Z";

describe("studioElapsed", () => {
  test("breaks elapsed time into days/hours/minutes/seconds", () => {
    const now = new Date("2026-06-16T16:14:32.000Z"); // 2d 6h 14m 32s later
    expect(studioElapsed(START, now)).toEqual({
      days: 2,
      hours: 6,
      minutes: 14,
      seconds: 32,
      totalMs: (2 * 86400 + 6 * 3600 + 14 * 60 + 32) * 1000,
    });
  });

  test("a future start clamps to zero (never negative)", () => {
    expect(studioElapsed(START, new Date("2026-06-14T09:59:59.000Z")).totalMs).toBe(0);
  });

  test("an unparseable start clamps to zero", () => {
    expect(studioElapsed("not-a-date", new Date()).totalMs).toBe(0);
  });

  test("seconds roll into the next minute", () => {
    const e = studioElapsed(START, new Date("2026-06-14T10:01:00.000Z"));
    expect([e.minutes, e.seconds]).toEqual([1, 0]);
  });
});

describe("formatStudioElapsed", () => {
  test("days form pads h/m/s", () =>
    expect(formatStudioElapsed({ days: 2, hours: 6, minutes: 14, seconds: 32, totalMs: 0 })).toBe(
      "2d 06h 14m 32s",
    ));
  test("under a day drops the days segment", () =>
    expect(formatStudioElapsed({ days: 0, hours: 6, minutes: 14, seconds: 5, totalMs: 0 })).toBe(
      "6h 14m 05s",
    ));
  test("under an hour drops the hours segment", () =>
    expect(formatStudioElapsed({ days: 0, hours: 0, minutes: 14, seconds: 5, totalMs: 0 })).toBe(
      "14m 05s",
    ));
  test("under a minute is seconds only", () =>
    expect(formatStudioElapsed({ days: 0, hours: 0, minutes: 0, seconds: 9, totalMs: 0 })).toBe(
      "9s",
    ));
});

describe("formatStudioElapsedCoarse", () => {
  test("multiple days", () =>
    expect(formatStudioElapsedCoarse({ days: 2, hours: 6, minutes: 0, seconds: 0, totalMs: 0 })).toBe(
      "2 days",
    ));
  test("one day is singular", () =>
    expect(formatStudioElapsedCoarse({ days: 1, hours: 0, minutes: 0, seconds: 0, totalMs: 0 })).toBe(
      "1 day",
    ));
  test("hours", () =>
    expect(formatStudioElapsedCoarse({ days: 0, hours: 5, minutes: 0, seconds: 0, totalMs: 0 })).toBe(
      "about 5 hours",
    ));
  test("under an hour", () =>
    expect(formatStudioElapsedCoarse({ days: 0, hours: 0, minutes: 20, seconds: 0, totalMs: 0 })).toBe(
      "under an hour",
    ));
});

describe("formatStudioSince", () => {
  test("month and day in UTC", () => expect(formatStudioSince(START)).toBe("June 14"));
  test("invalid date yields empty string", () => expect(formatStudioSince("nope")).toBe(""));
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/lib/studio-elapsed.test.ts`
Expected: FAIL — "Failed to resolve import \"@/lib/studio-elapsed\"".

- [ ] **Step 3: Implement the lib**

Create `lib/studio-elapsed.ts`:

```ts
/**
 * Studio-elapsed — the customer dashboard's "in the studio for …" count-up, as
 * pure data. No React, no DB. Counts UP from when an order entered production
 * (orders.inStudioSince), the sincere counterpart to the days-granularity
 * delivery COUNTDOWN in lib/delivery.ts. Unit-tested in
 * tests/lib/studio-elapsed.test.ts.
 */

export interface Elapsed {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/** Elapsed time from `startISO` to `now`, never negative; invalid start → zero. */
export function studioElapsed(startISO: string, now: Date): Elapsed {
  const start = new Date(startISO).getTime();
  const ms = Number.isNaN(start) ? 0 : Math.max(0, now.getTime() - start);
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalMs: ms,
  };
}

function two(n: number): string {
  return String(n).padStart(2, "0");
}

/** Ticking form: "2d 06h 14m 32s", shedding leading empty segments. */
export function formatStudioElapsed(e: Elapsed): string {
  if (e.days > 0) return `${e.days}d ${two(e.hours)}h ${two(e.minutes)}m ${two(e.seconds)}s`;
  if (e.hours > 0) return `${e.hours}h ${two(e.minutes)}m ${two(e.seconds)}s`;
  if (e.minutes > 0) return `${e.minutes}m ${two(e.seconds)}s`;
  return `${e.seconds}s`;
}

/** Calm static form for reduced-motion + screen readers: "2 days" / "about 5 hours". */
export function formatStudioElapsedCoarse(e: Elapsed): string {
  if (e.days >= 1) return `${e.days} ${e.days === 1 ? "day" : "days"}`;
  if (e.hours >= 1) return `about ${e.hours} ${e.hours === 1 ? "hour" : "hours"}`;
  return "under an hour";
}

/** "June 14" — UTC so the server timezone never shifts the date. */
export function formatStudioSince(startISO: string): string {
  const d = new Date(startISO);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run tests/lib/studio-elapsed.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 5: Commit**

```bash
git add lib/studio-elapsed.ts tests/lib/studio-elapsed.test.ts
git commit -m "feat(lib): studio-elapsed count-up math + formatting (TDD)"
```

---

## Task 3: `lib/in-studio-stamp.ts` — stamp-once decision (TDD)

A pure function so the "stamp the start time the first time, never reset it" rule is unit-tested once and reused verbatim at all three transition sites.

**Files:**
- Create: `tests/lib/in-studio-stamp.test.ts`
- Create: `lib/in-studio-stamp.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/in-studio-stamp.test.ts`:

```ts
/**
 * in-studio-stamp — the pure "stamp inStudioSince once" decision, reused at
 * every site that moves an order into production. No DB.
 */
import { describe, expect, test } from "vitest";

import { inStudioStamp } from "@/lib/in-studio-stamp";

const NOW = new Date("2026-06-16T12:00:00.000Z");

describe("inStudioStamp", () => {
  test("stamps when entering in_production with no prior stamp", () => {
    expect(
      inStudioStamp({ nextStatus: "in_production", currentInStudioSince: null, now: NOW }),
    ).toEqual({ inStudioSince: NOW.toISOString() });
  });

  test("does not re-stamp when already stamped (re-entry keeps the original)", () => {
    expect(
      inStudioStamp({
        nextStatus: "in_production",
        currentInStudioSince: "2026-06-14T10:00:00.000Z",
        now: NOW,
      }),
    ).toEqual({});
  });

  test("does not stamp for non-production statuses", () => {
    expect(
      inStudioStamp({ nextStatus: "proof_ready", currentInStudioSince: null, now: NOW }),
    ).toEqual({});
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/lib/in-studio-stamp.test.ts`
Expected: FAIL — "Failed to resolve import \"@/lib/in-studio-stamp\"".

- [ ] **Step 3: Implement the lib**

Create `lib/in-studio-stamp.ts`:

```ts
/**
 * in-studio-stamp — decide whether a status change should stamp
 * orders.inStudioSince. The stamp is set ONCE, the first time an order enters
 * production, and never reset (so "Back to production" after revisions keeps the
 * original start time). Pure; unit-tested in tests/lib/in-studio-stamp.test.ts.
 *
 * Spread the result into a Payload update's `data`:
 *   data: { status: nextStatus, ...inStudioStamp({ nextStatus, currentInStudioSince, now }) }
 */
import type { OrderStatus } from "@/lib/order-stages";

export function inStudioStamp(args: {
  nextStatus: OrderStatus;
  currentInStudioSince?: string | null;
  now: Date;
}): { inStudioSince: string } | Record<string, never> {
  if (args.nextStatus === "in_production" && !args.currentInStudioSince) {
    return { inStudioSince: args.now.toISOString() };
  }
  return {};
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run tests/lib/in-studio-stamp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/in-studio-stamp.ts tests/lib/in-studio-stamp.test.ts
git commit -m "feat(lib): in-studio-stamp stamp-once decision (TDD)"
```

---

## Task 4: Stamp `inStudioSince` at the three transition sites

Wire the pure helper into the three places an order first enters production, then confirm persistence with DB-backed tests at the two easily-seeded sites.

**Files:**
- Modify: `app/api/stripe/webhook/route.ts:304-313`
- Modify: `lib/order-action-cores.ts:123-130`
- Modify: `lib/studio-order-mutations.ts:68-73`
- Modify: `tests/stripe/webhook.test.ts:89-110` and `:113-133`
- Modify: `tests/studio/actions.test.ts` (add one test in the `applyOrderStatusCore` describe block)

- [ ] **Step 1: Stamp in the Stripe webhook (photos-attached path)**

In `app/api/stripe/webhook/route.ts`, add the import near the other `@/lib` imports (e.g. after the `createOrderTrackingLink` import on line 23):

```ts
import { inStudioStamp } from "@/lib/in-studio-stamp";
```

Then change the photos-attached update (currently lines 307-312):

```ts
      await payload.update({
        collection: "orders",
        id: order.id,
        data: { status: "in_production" },
        overrideAccess: true,
      });
```

to:

```ts
      await payload.update({
        collection: "orders",
        id: order.id,
        data: {
          status: "in_production",
          ...inStudioStamp({
            nextStatus: "in_production",
            currentInStudioSince: null, // brand-new order; never stamped yet
            now: new Date(),
          }),
        },
        overrideAccess: true,
      });
```

- [ ] **Step 2: Stamp in the customer upload auto-advance**

In `lib/order-action-cores.ts`, add the import with the other `@/lib` imports at the top of the file:

```ts
import { inStudioStamp } from "@/lib/in-studio-stamp";
```

Then change the update (currently lines 125-130) so it spreads the stamp. Replace:

```ts
  const nextStatus = order.status === "awaiting_assets" ? "in_production" : order.status;

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { assets: [...existing, ...newAssetIds], status: nextStatus },
    overrideAccess: true,
  });
```

with:

```ts
  const nextStatus = order.status === "awaiting_assets" ? "in_production" : order.status;

  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      assets: [...existing, ...newAssetIds],
      status: nextStatus,
      ...inStudioStamp({
        nextStatus,
        currentInStudioSince: (order.inStudioSince as string | null) ?? null,
        now: new Date(),
      }),
    },
    overrideAccess: true,
  });
```

- [ ] **Step 3: Stamp in the studio status transition**

In `lib/studio-order-mutations.ts`, add the import after line 22 (`import type { OrderStatus } ...`):

```ts
import { inStudioStamp } from "@/lib/in-studio-stamp";
```

Then change the update in `applyOrderStatusCore` (currently lines 68-73). Replace:

```ts
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: nextStatus },
    overrideAccess: true,
  });
  return { ok: true };
```

with:

```ts
  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      status: nextStatus,
      ...inStudioStamp({
        nextStatus,
        currentInStudioSince: (order.inStudioSince as string | null) ?? null,
        now: new Date(),
      }),
    },
    overrideAccess: true,
  });
  return { ok: true };
```

- [ ] **Step 4: Extend the webhook tests**

In `tests/stripe/webhook.test.ts`, in the test at line 89 ("checkout with assetPaths attaches metadata-only media and goes in_production"), after the existing `expect(order.status).toBe("in_production");` (line 109), add:

```ts
  expect(typeof order.inStudioSince).toBe("string"); // stamped on first entry to production
```

In the test at line 113 ("assetPaths outside the configurator/ prefix are NOT attached"), after the existing `expect(order.status).toBe("paid");` (line 133), add:

```ts
  expect(order.inStudioSince ?? null).toBeNull(); // never entered production → no stamp
```

- [ ] **Step 5: Add the studio-mutation stamp test**

In `tests/studio/actions.test.ts`, inside the `describe("applyOrderStatusCore", ...)` block (after the test ending at line 69), add:

```ts
  test("stamps inStudioSince on first in_production and never resets it", async () => {
    const { payload, order } = await seedOrder("paid");

    await applyOrderStatusCore(String(order.id), "in_production");
    const first = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(typeof first.inStudioSince).toBe("string");
    const stamp = first.inStudioSince as string;

    // Re-applying in_production must keep the original stamp.
    await new Promise((r) => setTimeout(r, 10));
    await applyOrderStatusCore(String(order.id), "in_production");
    const again = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(again.inStudioSince).toBe(stamp);
  });
```

> Coverage note: the customer upload path (Step 2) shares the identical `inStudioStamp(...)` helper, already unit-tested in Task 3. We deliberately do NOT add a DB test for it — `uploadOrderAssetsCore` round-trips a real file through Payload's upload pipeline, which `tests/app/order-actions.test.ts` intentionally avoids in the node test env. The pure-helper test plus the two DB confirmations here are the guard.

- [ ] **Step 6: Run the affected tests + typecheck**

Run: `npx vitest run tests/stripe/webhook.test.ts tests/studio/actions.test.ts && npx tsc --noEmit`
Expected: PASS (new assertions green; no type errors).

- [ ] **Step 7: Commit**

```bash
git add app/api/stripe/webhook/route.ts lib/order-action-cores.ts lib/studio-order-mutations.ts tests/stripe/webhook.test.ts tests/studio/actions.test.ts
git commit -m "feat(orders): stamp inStudioSince at the three entry-to-production sites"
```

---

## Task 5: `StudioLiveCard` component + export `heroName`

No vitest render test (the suite runs in node env with no jsdom/RTL — see `vitest.config.ts:14`). All branching logic lives in the Task 2/3 libs, which are tested; the card is verified visually in Task 6.

**Files:**
- Modify: `lib/order-stages.ts:112`
- Create: `components/app/studio-live-card.tsx`

- [ ] **Step 1: Export `heroName`**

In `lib/order-stages.ts`, change line 112 from:

```ts
function heroName(childName?: string): { possessive: string; subject: string } {
```

to:

```ts
export function heroName(childName?: string): { possessive: string; subject: string } {
```

- [ ] **Step 2: Create the component**

Create `components/app/studio-live-card.tsx`:

```tsx
"use client";

/**
 * StudioLiveCard — the "In the studio now" hero shown on the order detail page
 * while an order is actively being made (in_production / revisions). The
 * auto-playing builder mascot, perched at sign-in scale, beside a live count-up
 * of real time in the studio (lib/studio-elapsed.ts from orders.inStudioSince),
 * with the ready-by date as a calm sub-line.
 *
 * Motion is guarded by useReducedMotion(): the mascot falls back to its still
 * frame (MascotImage handles that), the pulse stops, and the counter shows a
 * static days-granularity form instead of ticking. The ticking number is
 * aria-hidden; a stable sr-only sentence carries the fact to screen readers.
 *
 * Overdue (past promisedBy) is read from lib/delivery.ts and swaps the counter
 * for the existing gentle "taking a little longer" copy — no alarming big number.
 */
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { MascotImage } from "@/components/app/mascot-image";
import { countdownState, formatPromisedDate } from "@/lib/delivery";
import { heroName, type OrderStatus } from "@/lib/order-stages";
import {
  studioElapsed,
  formatStudioElapsed,
  formatStudioElapsedCoarse,
  formatStudioSince,
} from "@/lib/studio-elapsed";

export function StudioLiveCard({
  status,
  promisedBy,
  inStudioSince,
  createdAt,
  childName,
}: {
  status: OrderStatus;
  promisedBy: string | null;
  inStudioSince: string | null;
  createdAt: string;
  childName?: string;
}) {
  const reduce = useReducedMotion();
  const startISO = inStudioSince ?? createdAt;
  const { possessive } = heroName(childName);

  const state = countdownState({ status, promisedBy, createdAt, now: new Date() });
  const overdue = state.kind === "overdue";
  const promised = promisedBy && !overdue ? new Date(promisedBy) : null;

  return (
    <div className="mt-6 rounded-3xl border-2 border-brand-deep bg-white px-6 pb-6 pt-3 text-center shadow-comic">
      <MascotImage
        animatedSrc="/mascot/builder-360.webp"
        staticSrc="/mascot/builder-static.png"
        width={224}
        height={360}
        className="mx-auto -mt-14 h-32 w-auto drop-shadow-[4px_4px_0_color-mix(in_srgb,var(--color-brand-deep)_20%,transparent)]"
      />

      <div className="mt-1 flex items-center justify-center gap-2">
        <LivePulse reduce={reduce} />
        <span
          className="text-xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          In the studio now
        </span>
      </div>

      {overdue ? (
        <p
          className="mx-auto mt-3 max-w-sm text-sm text-brand-deep/70"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          The final touches are taking a little longer than we hoped. It will be
          worth the wait.
        </p>
      ) : (
        <>
          <CraftingClock startISO={startISO} possessive={possessive} reduce={!!reduce} />
          {promised ? (
            <p
              className="mt-2 text-sm text-brand-deep/60"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              We expect it ready by {formatPromisedDate(promised)}.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** The "alive" dot beside the headline. Still under reduced motion. */
function LivePulse({ reduce }: { reduce: boolean | null }) {
  if (reduce) {
    return <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand-blue" />;
  }
  return (
    <motion.span
      aria-hidden
      className="h-2.5 w-2.5 rounded-full bg-brand-blue"
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.25, 1] }}
      transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

/** The "crafting … for {elapsed}" line: ticks when motion is allowed, static otherwise. */
function CraftingClock({
  startISO,
  possessive,
  reduce,
}: {
  startISO: string;
  possessive: string;
  reduce: boolean;
}) {
  if (reduce) {
    const coarse = formatStudioElapsedCoarse(studioElapsed(startISO, new Date()));
    return (
      <p
        className="mt-3 text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        crafting {possessive} story for {coarse}
      </p>
    );
  }
  return <TickingClock startISO={startISO} possessive={possessive} />;
}

/** Updates every second on the client. First paint shows a stable placeholder
 *  (no hydration mismatch); the sr-only sentence is always present. */
function TickingClock({ startISO, possessive }: { startISO: string; possessive: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now ? formatStudioElapsed(studioElapsed(startISO, now)) : "…";

  return (
    <p className="mt-3 text-brand-deep">
      <span
        className="block text-[0.62rem] font-bold uppercase tracking-[0.13em] text-brand-deep/50"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        crafting {possessive} story for
      </span>
      <span
        aria-hidden
        className="block text-2xl tabular-nums"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        {elapsed}
      </span>
      <span className="sr-only">In the studio, crafting since {formatStudioSince(startISO)}.</span>
    </p>
  );
}
```

- [ ] **Step 3: Typecheck + full test run**

Run: `npx tsc --noEmit && npm test`
Expected: PASS (tsc clean; the whole vitest suite green — nothing imports the component yet, so this just proves the export change and new files compile).

- [ ] **Step 4: Commit**

```bash
git add lib/order-stages.ts components/app/studio-live-card.tsx
git commit -m "feat(app): StudioLiveCard — perched animated mascot + live crafting clock"
```

---

## Task 6: Wire into the order detail page + visual verification

**Files:**
- Modify: `app/(site)/(app)/app/orders/[id]/page.tsx:23` (import) and `:133-138` (the gate)

- [ ] **Step 1: Import the component**

In `app/(site)/(app)/app/orders/[id]/page.tsx`, after the `DeliveryCountdown` import (line 23), add:

```ts
import { StudioLiveCard } from "@/components/app/studio-live-card";
```

- [ ] **Step 2: Swap in the card for the two production states**

Replace the current `DeliveryCountdown` block (lines 133-138):

```tsx
        <DeliveryCountdown
          status={status}
          promisedBy={(order.promisedBy as string | null) ?? null}
          createdAt={String(order.createdAt)}
          childName={childName}
        />
```

with:

```tsx
        {status === "in_production" || status === "revisions" ? (
          <StudioLiveCard
            status={status}
            promisedBy={(order.promisedBy as string | null) ?? null}
            inStudioSince={(order.inStudioSince as string | null) ?? null}
            createdAt={String(order.createdAt)}
            childName={childName}
          />
        ) : (
          <DeliveryCountdown
            status={status}
            promisedBy={(order.promisedBy as string | null) ?? null}
            createdAt={String(order.createdAt)}
            childName={childName}
          />
        )}
```

- [ ] **Step 3: Typecheck + full suite**

Run: `npx tsc --noEmit && npm test`
Expected: PASS.

- [ ] **Step 4: Visual verification (dev server)**

Start dev: `npm run dev` (serves on port 1234 per `package.json`). Get an order into `in_production` in the local/test DB (via Payload `/admin`, or the studio panel "Start production", or the agent MCP), then open `/app/orders/<id>`.

Confirm at **1280px** and **375px** widths:
- the mascot is large, perched over the card's top edge with the comic drop-shadow, and **animates on its own** (no interaction);
- the blue pulse dot gently pulses beside "In the studio now";
- the counter ticks **every second** ("crafting {Name}'s story for 2d 06h 14m 32s"; "your child's" when no name);
- "We expect it ready by …" shows beneath (and is absent if the order has no `promisedBy`).

Then in DevTools enable **Rendering → prefers-reduced-motion: reduce** and reload:
- the mascot holds on its still frame, the pulse is static, and the counter shows "crafting … for 2 days" with **no** ticking.

(The repo's convention for this kind of check is the Playwright MCP at 375/1280, per `fairy-tale-mind/plans/2026-06-04-configurator-wizard.md`. Screenshot both widths.) If the perch offset looks off, nudge the mascot's `-mt-14` / card `pt-3` in `components/app/studio-live-card.tsx` until it matches the sign-in perch.

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/(app)/app/orders/[id]/page.tsx"
git commit -m "feat(app): show StudioLiveCard for in_production/revisions on the order page"
```

---

## Task 7: Mind maintenance

**Files:**
- Modify: `fairy-tale-mind/map/zones/auth-gating.md`
- Create: `fairy-tale-mind/map/decisions/2026-06-16-in-studio-live-card.md`

- [ ] **Step 1: Write the decision record**

Create `fairy-tale-mind/map/decisions/2026-06-16-in-studio-live-card.md`:

```markdown
---
type: decision
summary: "On in_production/revisions orders the customer order page shows an 'In the studio now' hero (big auto-playing builder mascot + a live count-UP 'crafting for 2d 06h 14m 32s' clock from a new orders.inStudioSince stamp, + the ready-by date), replacing the days-ring DeliveryCountdown for just those two states. The seconds-granularity count-up is reconciled with the deliberate days-granularity delivery COUNTDOWN: this is elapsed-since-start, not a countdown, and it collapses to days under reduced motion."
tags: [customer-area, orders, ux]
status: active
created: 2026-06-16
related: ["[[auth-gating]]", "[[delivery-promise-auto-from-length]]"]
sources:
  - "components/app/studio-live-card.tsx"
  - "lib/studio-elapsed.ts"
  - "lib/in-studio-stamp.ts"
  - "fairy-tale-mind/specs/2026-06-16-in-studio-live-card-design.md"
decided: 2026-06-16
supersededBy: ""
---

## Context
The in_production state had nothing alive on it — a days ring and a static
message. We wanted the parent to feel that real work is happening right now.

## Decision
- A dedicated client component `StudioLiveCard` renders for `in_production` and
  `revisions` only, replacing `DeliveryCountdown` for those two states (it shows
  the ready-by date itself). Every other status keeps `DeliveryCountdown`.
- The hero is the existing animated builder mascot via `MascotImage` (auto-plays,
  still frame under reduced motion), perched at sign-in scale.
- The clock counts UP from a new `orders.inStudioSince`, stamped ONCE the first
  time an order enters production (Stripe webhook, customer upload auto-advance,
  studio transition — all via the pure `lib/in-studio-stamp.ts`), never reset.
  Legacy orders fall back to `createdAt`.

## Why
- A count-up of real production time is the sincere way to show "we are making
  this", and the seconds give the liveliness the brand owner asked for, without a
  resets-every-visit gimmick.
- It does NOT contradict [[delivery-promise-auto-from-length]]: that decision
  bans a ticking *countdown* (which reads like a shipping tracker). This is
  *elapsed time*, not a countdown, and under reduced motion it collapses to days
  granularity. The delivery promise is unchanged and still shown here.

## Consequences
- New column `orders.in_studio_since` (migration `20260616_000001_order_in_studio_since`).
- `heroName` is now exported from `lib/order-stages.ts`.
- `DeliveryCountdown`'s in_production branches are unreachable for those two
  statuses (left in place; still used by paid / awaiting_assets / proof_ready /
  approved).
```

- [ ] **Step 2: Update the `auth-gating` zone card**

In `fairy-tale-mind/map/zones/auth-gating.md`: add `components/app/studio-live-card.tsx`, `lib/studio-elapsed.ts`, and `lib/in-studio-stamp.ts` to the `sources:` list (beside the existing `components/app/mascot-image.tsx`); add a sentence to the order-detail description noting the in-studio live card (perched animated mascot + count-up crafting clock, replacing the days countdown while in production); and set its frontmatter `verifiedAt` to the current HEAD sha (`git rev-parse --short HEAD`).

- [ ] **Step 3: Regenerate the Mind index**

Run: `npm run mind`
Expected: regenerates `fairy-tale-mind/map/index.md`; the `auth-gating` row shows ✓ fresh.

- [ ] **Step 4: Commit**

```bash
git add fairy-tale-mind/
git commit -m "docs(mind): in-studio live card — decision record + auth-gating re-stamp"
```

---

## Self-Review

**1. Spec coverage** (each spec section → task):
- §1 appears in_production/revisions, replaces DeliveryCountdown → Task 6.
- §2 component (perched mascot, pulse, counter, ready-by) → Task 5.
- §3 `inStudioSince` field + 3 stamp sites + fallback + migration (no rels work) → Tasks 1, 4.
- §4 pure helper `studio-elapsed` → Task 2.
- §5 copy (heroName reuse, headline, counter, sr-only, overdue) → Tasks 5 (+ heroName export), 2.
- §6 reduced motion + a11y (no interval, aria-hidden number, sr-only, not aria-live) → Task 5.
- §7 edge cases (overdue via countdownState, no promise, legacy fallback) → Task 5.
- §8 testing → Tasks 2, 3, 4 (+ §8's component render replaced by visual check in Task 6, justified by node-env/no-RTL).
- §9 Mind → Task 7.
- §10 out of scope respected (no DeliveryCountdown change, no new art, delivery math untouched).

**2. Placeholder scan:** none — every code step shows full code; the only "adjust" is a bounded visual nudge of a concrete `-mt-14`/`pt-3` perch offset in Task 6 Step 4.

**3. Type consistency:** `inStudioStamp({ nextStatus, currentInStudioSince, now })` and its `{ inStudioSince: string } | {}` return are used identically in Tasks 3 and 4. `Elapsed` and the four `studio-elapsed` exports match between Task 2's tests, lib, and the Task 5 component. `StudioLiveCard` prop names (`status`, `promisedBy`, `inStudioSince`, `createdAt`, `childName`) match the Task 6 call site. `heroName` is exported (Task 5) before it is imported (Task 5 component).

**Spec refinement noted:** the spec described the stamp guard inline (`if (!order.inStudioSince)`); this plan extracts it to the pure, unit-tested `lib/in-studio-stamp.ts` and spreads it at each site — same behavior, better tested, consistent with the repo's "logic in pure libs" pattern.
