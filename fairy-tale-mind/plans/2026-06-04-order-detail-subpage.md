# Order Detail Subpage + Studio Notes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every order an owner-scoped page at `/app/orders/[id]` showing full details +
relocated per-status actions, and let the parent append free-text notes to the studio from a
dialog — saved on the order and shown back as a thread.

**Architecture:** New route under the `(app)` group (inherits the session gate + chrome). A
new `customerNotes` array on the Orders collection holds the thread. A new ownership-guarded
server action `addOrderNote` appends rows. Reads go through a new owner-scoped
`getOrderForCurrentCustomer` in `lib/customer-data.ts`. The dashboard list becomes link cards;
the per-status actions move to the detail page.

**Tech Stack:** Next.js 16 App Router (server components + server actions), Payload v3 Local
API, Better Auth session, Motion (`motion/react`) for the dialog, Tailwind v4, vitest + Playwright.

**Spec:** `fairy-tale-mind/specs/2026-06-04-order-detail-subpage-design.md`

---

### Task 1: Payload `customerNotes` field + label maps

**Files:**
- Modify: `collections/Orders.ts` (add a field to the `fields` array)
- Create: `lib/order-options.ts`

- [ ] **Step 1: Add the `customerNotes` array field**

In `collections/Orders.ts`, add this field object to the `fields` array (place it right after
the `revisionNote` field, before `status`):

```ts
    {
      name: "customerNotes",
      type: "array",
      labels: { singular: "Customer note", plural: "Customer notes" },
      admin: {
        description:
          "Notes the parent added from their order page. Read-only history; newest last.",
      },
      fields: [
        { name: "message", type: "textarea", required: true },
        { name: "createdAt", type: "date", admin: { readOnly: true } },
      ],
    },
```

- [ ] **Step 2: Create the label maps**

```ts
// lib/order-options.ts
/**
 * Human labels for the Orders collection's select fields, mirrored from
 * collections/Orders.ts so the customer-facing detail page can show the
 * parent's choices in words. Keep these in sync with the collection options.
 */
export const LENGTH_LABELS: Record<string, string> = {
  short: "Short",
  medium: "Medium",
  long: "Long",
};

export const DETAIL_LEVEL_LABELS: Record<string, string> = {
  basic: "Basic",
  detailed: "Detailed",
  premium: "Premium",
};
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add collections/Orders.ts lib/order-options.ts
git commit -m "feat(orders): add customerNotes array field + select label maps"
```

---

### Task 2: Owner-scoped single-order read (TDD)

**Files:**
- Modify: `lib/customer-data.ts`
- Test: `tests/auth/order-detail-read.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/auth/order-detail-read.test.ts
/**
 * Owner-scoped single-order read. getOrderForOwner(ownerId, orderId) must return
 * the doc ONLY when that owner owns it, and null otherwise (wrong owner / unknown
 * id) — the security boundary for the /app/orders/[id] detail page.
 */
import { describe, expect, test } from "vitest";

import { getOrderForOwner } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";

describe("getOrderForOwner", () => {
  test("returns the order for its owner, null for a non-owner or unknown id", async () => {
    const payload = await getPayloadClient();

    const userA = await payload.create({
      collection: "users",
      data: { email: `odr-a-${Date.now()}@example.com`, name: "A", emailVerified: false },
    });
    const userB = await payload.create({
      collection: "users",
      data: { email: `odr-b-${Date.now()}@example.com`, name: "B", emailVerified: false },
    });
    const orderA = await payload.create({
      collection: "orders",
      data: { owner: userA.id, childName: "Alice", status: "paid" },
    });

    // Owner sees it.
    const owned = await getOrderForOwner(String(userA.id), String(orderA.id));
    expect(owned?.id).toBe(orderA.id);

    // Non-owner does NOT.
    const notOwned = await getOrderForOwner(String(userB.id), String(orderA.id));
    expect(notOwned).toBeNull();

    // Unknown id → null.
    const missing = await getOrderForOwner(String(userA.id), "999999");
    expect(missing).toBeNull();

    await payload.delete({ collection: "orders", id: orderA.id });
    await payload.delete({ collection: "users", id: userA.id });
    await payload.delete({ collection: "users", id: userB.id });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/auth/order-detail-read.test.ts`
Expected: FAIL — `getOrderForOwner` is not exported.

- [ ] **Step 3: Implement the helpers**

Append to `lib/customer-data.ts` (after `getOrdersForCurrentCustomer`):

```ts
/**
 * Fetch a single order by id, but ONLY if `ownerId` owns it. Returns the doc or
 * null (unknown id, or owned by someone else). The owner scope is an explicit
 * part of the query — the security boundary for the order detail page. Unknown
 * ids never throw: a bad id reads as "not found".
 */
export async function getOrderForOwner(ownerId: string, orderId: string) {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "orders",
    where: {
      and: [{ id: { equals: orderId } }, { owner: { equals: ownerId } }],
    },
    overrideAccess: true,
    depth: 0,
    limit: 1,
  });
  return result.docs[0] ?? null;
}

/**
 * Returns the given order if it belongs to the currently signed-in customer,
 * else null (no session, or not theirs).
 */
export async function getOrderForCurrentCustomer(orderId: string) {
  const session = await getCustomerSession();
  if (!session) return null;
  return getOrderForOwner(session.user.id, orderId);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run tests/auth/order-detail-read.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/customer-data.ts tests/auth/order-detail-read.test.ts
git commit -m "feat(customer-data): owner-scoped single-order read + test"
```

---

### Task 3: `addOrderNote` server action (TDD)

**Files:**
- Modify: `lib/order-actions.ts`
- Test: `tests/auth/add-order-note.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/auth/add-order-note.test.ts
/**
 * addOrderNote appends a customer note to an order. We test the DB-facing core
 * (validation + append) via a testable helper that takes an explicit ownerId,
 * mirroring how getOrdersForOwner is unit-tested without a session.
 */
import { describe, expect, test } from "vitest";

import { appendCustomerNote, MAX_NOTE_LENGTH } from "@/lib/order-actions";
import { getPayloadClient } from "@/lib/payload";

describe("appendCustomerNote", () => {
  test("rejects empty and oversized messages", async () => {
    expect((await appendCustomerNote("1", "   ")).ok).toBe(false);
    expect((await appendCustomerNote("1", "x".repeat(MAX_NOTE_LENGTH + 1))).ok).toBe(false);
  });

  test("appends a row, preserving existing notes", async () => {
    const payload = await getPayloadClient();
    const user = await payload.create({
      collection: "users",
      data: { email: `note-${Date.now()}@example.com`, name: "N", emailVerified: false },
    });
    const order = await payload.create({
      collection: "orders",
      data: {
        owner: user.id,
        childName: "Nia",
        status: "paid",
        customerNotes: [{ message: "first", createdAt: new Date().toISOString() }],
      },
    });

    const result = await appendCustomerNote(String(order.id), "  second  ");
    expect(result.ok).toBe(true);

    const updated = await payload.findByID({ collection: "orders", id: order.id, depth: 0 });
    const notes = updated.customerNotes as { message: string }[];
    expect(notes.map((n) => n.message)).toEqual(["first", "second"]); // trimmed, appended

    await payload.delete({ collection: "orders", id: order.id });
    await payload.delete({ collection: "users", id: user.id });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run tests/auth/add-order-note.test.ts`
Expected: FAIL — `appendCustomerNote` / `MAX_NOTE_LENGTH` not exported.

- [ ] **Step 3: Implement the helper + action**

Add to `lib/order-actions.ts`. First the imports already present (`getPayloadClient`,
`revalidatePath`, `assertOwnsOrder`) are enough. Add near the top, after the existing imports:

```ts
/** The longest a single customer note may be. */
export const MAX_NOTE_LENGTH = 2000;

/** The result of a note submission, surfaced to the dialog. */
export type AddNoteResult = { ok: true } | { ok: false; error: string };
```

Then add the testable core (NO session check — it takes a resolved order id and is called by
the guarded action) and the public action:

```ts
/**
 * Append a single customer note to an order's `customerNotes`, preserving prior
 * rows. Validates the message is non-empty and within MAX_NOTE_LENGTH. This is
 * the DB-facing core; the public `addOrderNote` action wraps it with the
 * ownership guard. Reads/writes via the Local API with overrideAccess (Orders is
 * staff-only); call sites must enforce ownership.
 */
export async function appendCustomerNote(
  orderId: string,
  message: string,
): Promise<AddNoteResult> {
  const trimmed = message?.trim() ?? "";
  if (trimmed.length === 0) {
    return { ok: false, error: "Please write a note before sending." };
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: "That note is a little long. Please shorten it." };
  }

  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });

  const existing = Array.isArray(order.customerNotes) ? order.customerNotes : [];

  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      customerNotes: [
        ...existing,
        { message: trimmed, createdAt: new Date().toISOString() },
      ],
    },
    overrideAccess: true,
  });

  return { ok: true };
}

/**
 * The parent adds a note to the studio from their order page. Ownership-checked
 * (the single mutation doorway), then appended. Available at any status. Does
 * not change `status`.
 */
export async function addOrderNote(
  orderId: string,
  message: string,
): Promise<AddNoteResult> {
  await assertOwnsOrder(orderId);
  const result = await appendCustomerNote(orderId, message);
  if (result.ok) {
    revalidatePath(`/app/orders/${orderId}`);
  }
  return result;
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `npx vitest run tests/auth/add-order-note.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/order-actions.ts tests/auth/add-order-note.test.ts
git commit -m "feat(order-actions): addOrderNote (ownership-guarded) + append core + tests"
```

---

### Task 4: `OrderNotes` client island (thread + dialog)

**Files:**
- Create: `components/app/order-notes.tsx`

- [ ] **Step 1: Build the component**

```tsx
// components/app/order-notes.tsx
"use client";

/**
 * OrderNotes — the customer's note thread for one order, plus an "Add a note"
 * dialog. Renders existing notes (passed from the server page) as a chronological
 * log, and a Motion modal with a textarea that calls the addOrderNote server
 * action. Available at any status. Motion is reduced-motion-guarded; the dialog
 * closes on Escape, backdrop click, or a successful send.
 */
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { addOrderNote, MAX_NOTE_LENGTH } from "@/lib/order-actions";

export interface CustomerNote {
  message: string;
  createdAt?: string | null;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function OrderNotes({
  orderId,
  notes,
}: {
  orderId: string;
  notes: CustomerNote[];
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function submit() {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      setError("Please write a note before sending.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addOrderNote(orderId, trimmed);
      if (result.ok) {
        setMessage("");
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Notes for our studio
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full border-2 border-brand-deep bg-brand-yellow px-4 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Add a note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          No notes yet. Add anything that will help us tell their story — a nickname, a favorite
          color, a detail to include.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note, i) => (
            <li
              key={i}
              className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-4"
            >
              <p
                className="whitespace-pre-wrap text-brand-deep"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                {note.message}
              </p>
              {formatDate(note.createdAt) ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-deep/50">
                  {formatDate(note.createdAt)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="absolute inset-0 bg-brand-deep/40"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Add a note for the studio"
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
              }}
              initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
              animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
              className="relative z-10 w-full max-w-lg rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8"
            >
              <h3
                className="text-xl text-brand-deep"
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                Add a note for the studio
              </h3>
              <p
                className="mt-1 text-sm text-brand-deep/70"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                Anything that helps us tell their story. We read every note.
              </p>
              <textarea
                autoFocus
                value={message}
                maxLength={MAX_NOTE_LENGTH}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="For example: she has a little brother, Max, and loves dinosaurs."
                className="mt-4 w-full rounded-2xl border-2 border-brand-deep bg-brand-cream p-3 text-brand-deep outline-none focus:ring-2 focus:ring-brand-blue"
                style={{ fontFamily: "var(--font-quicksand)" }}
              />
              {error ? (
                <p className="mt-2 text-sm font-semibold text-brand-pink">{error}</p>
              ) : null}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="rounded-full border-2 border-brand-deep bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-cream disabled:opacity-60"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="rounded-full border-2 border-brand-deep bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-60"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  {pending ? "Sending…" : "Send to the studio"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/app/order-notes.tsx
git commit -m "feat(app): OrderNotes thread + add-note dialog client island"
```

---

### Task 5: The order detail page route

**Files:**
- Create: `app/(app)/app/orders/[id]/page.tsx`

- [ ] **Step 1: Build the page**

```tsx
// app/(app)/app/orders/[id]/page.tsx
/**
 * /app/orders/[id] — one order's full page.
 *
 * Owner-scoped: reads via getOrderForCurrentCustomer(id) and 404s if the order
 * is not the signed-in customer's. Shows the status timeline + message, the
 * relocated per-status action (photo upload / proof review / final video), a
 * read-only summary of the choices the parent made, and the studio notes thread.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrderForCurrentCustomer } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";
import {
  messageForStatus,
  stageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";
import { LENGTH_LABELS, DETAIL_LEVEL_LABELS } from "@/lib/order-options";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { StatusTimeline } from "@/components/app/status-timeline";
import { PhotoUpload } from "@/components/app/photo-upload";
import { ProofReview } from "@/components/app/proof-review";
import { VideoPlayer } from "@/components/app/video-player";
import { OrderNotes, type CustomerNote } from "@/components/app/order-notes";

export const metadata: Metadata = {
  title: "Your order — Yours Fairy Tale",
};

interface ProofMedia {
  url?: string | null;
  mimeType?: string | null;
  alt?: string | null;
}

async function loadProof(proofId?: string | null): Promise<ProofMedia | null> {
  if (!proofId) return null;
  try {
    const payload = await getPayloadClient();
    const media = await payload.findByID({
      collection: "media",
      id: proofId,
      depth: 0,
      overrideAccess: true,
    });
    return { url: media.url ?? null, mimeType: media.mimeType ?? null, alt: media.alt ?? null };
  } catch {
    return null;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForCurrentCustomer(id);
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const childName =
    typeof order.childName === "string" && order.childName.trim()
      ? order.childName.trim()
      : undefined;
  const title = childName ? `${childName}'s fairy tale` : "Your fairy tale";
  const world = order.world ? WORLD_LABELS[order.world as WorldId] : undefined;
  const message = messageForStatus(status, childName);
  const result = stageForStatus(status);
  const onHappyPath = "activeIndex" in result;
  const proof = status === "proof_ready" ? await loadProof(order.proof as string | null) : null;
  const notes = (Array.isArray(order.customerNotes) ? order.customerNotes : []) as CustomerNote[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6">
      <div>
        <Link
          href="/app"
          className="text-sm font-bold text-brand-deep/70 underline-offset-4 hover:underline"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          ← Back to your videos
        </Link>
      </div>

      <article className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl text-brand-deep md:text-4xl" style={{ fontFamily: "var(--font-fredoka)" }}>
            {title}
          </h1>
          {world ? (
            <p
              className="mt-1 text-sm font-semibold uppercase tracking-widest text-brand-pink"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              {world}
            </p>
          ) : null}
        </header>

        {onHappyPath ? (
          <StatusTimeline status={status} childName={childName} className="mb-7" />
        ) : null}

        <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
          <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            {message.headline}
          </h2>
          <p className="mt-1 text-brand-deep/80" style={{ fontFamily: "var(--font-quicksand)" }}>
            {message.body}
          </p>
        </div>

        <ActionSlot order={order} status={status} childName={childName} proof={proof} />
      </article>

      <StoryPanel order={order} />

      <OrderNotes orderId={String(order.id)} notes={notes} />
    </div>
  );
}

function ActionSlot({
  order,
  status,
  childName,
  proof,
}: {
  order: Record<string, unknown>;
  status: OrderStatus;
  childName?: string;
  proof: ProofMedia | null;
}) {
  if (status === "awaiting_assets") {
    return (
      <div className="mt-6">
        <PhotoUpload orderId={String(order.id)} childName={childName} />
      </div>
    );
  }
  if (status === "proof_ready") {
    return (
      <div className="mt-6">
        <ProofReview orderId={String(order.id)} childName={childName} proof={proof} />
      </div>
    );
  }
  if (status === "delivered") {
    return (
      <div className="mt-6">
        <VideoPlayer
          orderId={String(order.id)}
          childName={childName}
          hasVideo={Boolean(order.finalVideo)}
        />
      </div>
    );
  }
  return null;
}

/** A read-only summary of the choices the parent made at checkout. */
function StoryPanel({ order }: { order: Record<string, unknown> }) {
  const world = order.world ? WORLD_LABELS[order.world as WorldId] : undefined;
  const length = order.length ? LENGTH_LABELS[order.length as string] : undefined;
  const detail = order.detailLevel ? DETAIL_LEVEL_LABELS[order.detailLevel as string] : undefined;
  const extraMinutes = typeof order.extraMinutes === "number" ? order.extraMinutes : 0;
  const addOns = Array.isArray(order.addOns) ? (order.addOns as string[]) : [];
  const plotNote = typeof order.plotNote === "string" ? order.plotNote.trim() : "";

  const rows: { label: string; value: string }[] = [];
  if (world) rows.push({ label: "World", value: world });
  if (length) rows.push({ label: "Length", value: length });
  if (detail) rows.push({ label: "Detail", value: detail });
  if (extraMinutes > 0) rows.push({ label: "Extra minutes", value: String(extraMinutes) });
  if (addOns.length > 0) rows.push({ label: "Add-ons", value: addOns.join(", ") });

  if (rows.length === 0 && !plotNote) return null;

  return (
    <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        Your story
      </h2>
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3" style={{ fontFamily: "var(--font-quicksand)" }}>
          {rows.map((row) => (
            <div key={row.label} className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-brand-deep/50">
                {row.label}
              </dt>
              <dd className="mt-0.5 font-bold text-brand-deep">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {plotNote ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-deep/50">
            Your plot idea
          </p>
          <p
            className="mt-1 whitespace-pre-wrap text-brand-deep/80"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            {plotNote}
          </p>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles + builds**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 type errors; build succeeds (the new route appears in the build output).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/app/orders/\[id\]/page.tsx
git commit -m "feat(app): order detail page at /app/orders/[id]"
```

---

### Task 6: Dashboard list → link cards (relocate actions)

**Files:**
- Modify: `app/(app)/app/page.tsx`

- [ ] **Step 1: Refactor the list to link cards**

Rewrite `app/(app)/app/page.tsx` so the page no longer loads proofs or renders the per-status
actions (those now live on the detail page). Each order renders as a `<Link>` card that lifts
on hover via `group-hover` on the stable `<li>`. Replace the `OrderCard` + `ActionSlot` +
`loadProof` machinery with this:

```tsx
import type { Metadata } from "next";
import Link from "next/link";

import { getOrdersForCurrentCustomer } from "@/lib/customer-data";
import {
  messageForStatus,
  stageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";
import { StatusTimeline } from "@/components/app/status-timeline";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";

export const metadata: Metadata = {
  title: "Your videos — Yours Fairy Tale",
};

interface OrderLike {
  id: string;
  childName?: string | null;
  world?: string | null;
  status: OrderStatus;
}

export default async function AppPage() {
  const orders = (await getOrdersForCurrentCustomer()) as OrderLike[];

  return (
    <div className="mx-auto max-w-2xl px-6">
      <header className="mb-10">
        <h1 className="text-4xl text-brand-deep md:text-5xl" style={{ fontFamily: "var(--font-fredoka)" }}>
          Your videos
        </h1>
        <p className="mt-2 text-lg text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          Follow every step as we bring their story to life.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-8">
          {orders.map((order) => (
            <li key={order.id} className="group">
              <OrderSummaryCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderSummaryCard({ order }: { order: OrderLike }) {
  const childName = order.childName?.trim() || undefined;
  const title = childName ? `${childName}'s fairy tale` : "Your fairy tale";
  const world = order.world ? WORLD_LABELS[order.world as WorldId] : undefined;
  const message = messageForStatus(order.status, childName);
  const onHappyPath = "activeIndex" in stageForStatus(order.status);

  return (
    <Link
      href={`/app/orders/${order.id}`}
      className="block rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic transition-shadow group-hover:shadow-comic-lg md:p-8"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-brand-deep md:text-3xl" style={{ fontFamily: "var(--font-fredoka)" }}>
            {title}
          </h2>
          {world ? (
            <p
              className="mt-1 text-sm font-semibold uppercase tracking-widest text-brand-pink"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              {world}
            </p>
          ) : null}
        </div>
        <span
          className="shrink-0 pt-1 text-sm font-bold text-brand-deep/60"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          View details →
        </span>
      </header>

      {onHappyPath ? (
        <StatusTimeline status={order.status} childName={childName} className="mb-6" />
      ) : null}

      <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
        <h3 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          {message.headline}
        </h3>
      </div>
    </Link>
  );
}
```

Keep the existing `EmptyState` function exactly as-is at the bottom of the file. Remove the now
unused imports (`getPayloadClient`, `PhotoUpload`, `ProofReview`, `VideoPlayer`) and the
`loadProof` / `ProofMedia` / `OrderCard` / `ActionSlot` definitions.

- [ ] **Step 2: Verify it compiles + builds**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 errors (no unused-import or undefined-symbol errors), build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/app/page.tsx
git commit -m "feat(app): dashboard orders become link cards; actions move to detail page"
```

---

### Task 7: E2E coverage + final verification + Mind

**Files:**
- Modify: `e2e/dashboard.spec.ts`

- [ ] **Step 1: Read the existing dashboard spec**

Read `e2e/dashboard.spec.ts` fully to learn its seeding + sign-in helpers (Layer B, DB-backed
on the Neon test branch). Identify how it creates an order and lands an authenticated session
on `/app`.

- [ ] **Step 2: Add a detail-page + note test**

Following the file's existing patterns (do not invent new fixtures — reuse the seed/sign-in
helpers already imported there), add a test that:
1. Seeds an order for the signed-in test user and visits `/app`.
2. Clicks the order card (it links to `/app/orders/<id>`) and asserts the detail page shows
   the child name heading and the "Notes for our studio" section.
3. Clicks "Add a note", fills the textarea, clicks "Send to the studio", and asserts the note
   text appears in the thread after the action resolves.

Use the spec's existing locators/assertions style. If the spec uses a `@smoke`/Layer tag,
match it.

- [ ] **Step 3: Run the affected unit/integration tests**

Run: `npx vitest run tests/auth/order-detail-read.test.ts tests/auth/add-order-note.test.ts`
Expected: PASS (these need the Neon test branch env, same as existing DB-backed vitest).

- [ ] **Step 4: Full type + build gate**

Run: `npx tsc --noEmit && npm run build`
Expected: 0 type errors; build succeeds.

- [ ] **Step 5: Runtime verification (use the `verify` skill)**

Sign in locally, open `/app`, click an order into `/app/orders/[id]`. Confirm: full details +
the correct per-status action render; the "Your story" panel shows the choices; adding a note
via the dialog persists and shows in the thread; a non-owned/unknown id 404s. Capture a
screenshot.

- [ ] **Step 6: Commit the test**

```bash
git add e2e/dashboard.spec.ts
git commit -m "test(e2e): order detail page navigation + add-note flow"
```

- [ ] **Step 7: Mind maintenance**

- Update `fairy-tale-mind/map/zones/auth-gating.md`: owner-scoped reads now include a
  single-order fetch (`getOrderForOwner` / `getOrderForCurrentCustomer`) backing the
  `/app/orders/[id]` detail page; note the `addOrderNote` guarded action and the
  `customerNotes` thread. Re-stamp `verifiedAt` to HEAD short SHA.
- Add a `fairy-tale-mind/map/decisions/` record: notes-only (no config edit) + always-open
  (any status) + shown-back thread.
- File `fairy-tale-mind/tech-debt/`: studio gets no email/notification when a customer note
  lands (visible only in `/admin`).
- Run `npm run mind` and commit the regenerated `map/index.md` together with the zone/decision/
  debt files.

---

## Self-review notes

- **Spec coverage:** route + gating (Task 5/2), list→links (Task 6), detail panels (Task 5),
  notes dialog (Task 4), data model (Task 1), server action (Task 3), owner read (Task 2),
  tests (Task 2/3/7), Mind (Task 7). All spec sections map to a task.
- **Type consistency:** `AddNoteResult`, `MAX_NOTE_LENGTH`, `CustomerNote`, `getOrderForOwner`,
  `getOrderForCurrentCustomer`, `appendCustomerNote`, `addOrderNote` are defined once and
  referenced consistently across tasks.
- **Relocation risk:** Task 6 removes the per-status actions from the list; Task 7 Step 2
  updates the e2e that previously asserted them on `/app` (now asserted on the detail page).
