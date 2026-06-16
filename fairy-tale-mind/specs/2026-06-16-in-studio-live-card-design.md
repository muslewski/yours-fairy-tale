---
type: spec
summary: "A perched-hero 'In the studio now' card on the order detail page for in_production/revisions orders: the animated builder mascot + a live count-up 'crafting for 2d 06h 14m 32s' clock from a new inStudioSince stamp, with the ready-by date as a calm sub-line. Replaces the days-ring DeliveryCountdown for those two states only."
status: draft
created: 2026-06-16
related: ["[[auth-gating]]", "[[delivery-promise-auto-from-length]]"]
sources:
  - "components/app/delivery-countdown.tsx"
  - "components/app/mascot-image.tsx"
  - "lib/order-stages.ts"
  - "lib/delivery.ts"
---

# In-studio live card — design

**Goal:** On an order that is actively being made, give the parent a calm,
*alive* signal that real work is happening right now — the animated builder
mascot, big and perched like the studio sign-in, beside a live clock counting up
the real time the film has been in the studio, with the delivery promise kept as
a quiet sub-line.

**Status of decisions (all settled in brainstorming):**
- Concept: **C — ambient "live now"** (not a count-down, not a fake session
  stopwatch).
- The seconds: **real time in the studio**, counting **up** from when the order
  first entered production.
- Layout: **perched and centered**, the studio sign-in treatment, mascot big.
- Build approach: **Approach 1** — dedicated component + a real `inStudioSince`
  timestamp (migration), not a `createdAt` shortcut.

---

## 1. Where it appears

The card shows **only** for statuses where the studio is genuinely working:
`in_production` and `revisions`. For those two states it **replaces** the
days-ring `DeliveryCountdown`; the card carries the ready-by date itself, so the
promise is not lost. Every other status renders `DeliveryCountdown` exactly as
today (unchanged).

This is a pure status gate, decided on the server in
`app/(site)/(app)/app/orders/[id]/page.tsx`:

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

`DeliveryCountdown` is left untouched — its existing in_production branches
(days ring + overdue mascot) simply become unreachable for those two statuses,
which is fine. Minimal blast radius; no behavior change for paid /
awaiting_assets / proof_ready / approved / delivered / refunded / cancelled.

## 2. The component

`components/app/studio-live-card.tsx` — a client component (`"use client"`,
needed for `useReducedMotion()` and the ticking interval).

Layout (the perched-hero, mirroring `app/(site)/studio/sign-in/page.tsx`):
- A white card: `rounded-3xl border-2 border-brand-deep bg-white shadow-comic`,
  matching the other order cards. Centered content.
- The mascot via the existing **`MascotImage`** (`components/app/mascot-image.tsx`)
  — `animatedSrc="/mascot/builder-360.webp"`, `staticSrc="/mascot/builder-static.png"`,
  rendered large (`~h-32 w-auto`), pulled up over the top edge (`-mt-16`-style
  negative margin) with the comic drop-shadow
  `drop-shadow-[4px_4px_0_color-mix(in_srgb,var(--color-brand-deep)_20%,transparent)]`.
  `MascotImage` already renders the still PNG on the server and swaps in the
  **auto-playing** animated webp only when motion is allowed — so "it plays on
  its own" is free; do **not** wrap it in `next/image` (the optimizer freezes
  the animation).
- A live **pulse dot** (small `bg-brand-blue` circle, expanding ring keyframe)
  next to the headline **"In the studio now"** (Fredoka).
- The live counter line (see §3 + §4 for copy and a11y).
- The calm sub-line: **"We expect it ready by {date}."** — omitted when the
  order has no `promisedBy`.

The card composes the live counter from a small child or inline `useEffect`
ticker; the mascot stays in `MascotImage`. Keep the file focused: the card owns
presentation, the date math lives in `lib/delivery.ts`, the elapsed math in
`lib/studio-elapsed.ts`.

## 3. The data: `inStudioSince`

The clock must measure **real** production time, so we stamp when production
actually starts rather than reusing `createdAt`.

- **Field:** add `inStudioSince` to `collections/Orders.ts` as
  `{ name: "inStudioSince", type: "date", admin: { readOnly: true } }`, placed
  beside `promisedBy`. Date field → Postgres `timestamp(3) with time zone`,
  matching `promisedBy`'s column.
- **Stamp once, at first entry to production**, at all three transition sites,
  guarded `if (!order.inStudioSince)` so re-entry (e.g. "Back to production"
  after revisions) never resets the clock:
  1. **Stripe webhook**, photos-attached path —
     `app/api/stripe/webhook/route.ts:307` (the `data: { status: "in_production" }`
     update): add `inStudioSince: new Date().toISOString()`.
  2. **Customer photo-upload auto-advance** —
     `lib/order-action-cores.ts:123-130`: when `nextStatus` flips
     `awaiting_assets → in_production`, also write `inStudioSince` (only if not
     already set).
  3. **Studio status transition** — `lib/studio-order-mutations.ts:71`
     (`applyOrderStatusCore`, `data: { status: nextStatus }`): when
     `nextStatus === "in_production"` and `!order.inStudioSince`, write it.
- **Fallback:** legacy orders created before this field exists have no stamp;
  the card falls back to `createdAt` so the clock still renders.
- **Migration:** `migrations/<date>_orders_in_studio_since.ts` —
  `ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_studio_since timestamp(3) with time zone;`
  with the repo's per-statement try/catch idempotent style; register it in
  `migrations/index.ts`. This is a **plain column add to an existing table**, so
  — unlike adding a collection — it needs **no** changes to
  `payload_locked_documents_rels` / `payload_preferences_rels`.

## 4. The pure helper (TDD)

`lib/studio-elapsed.ts` — DOM-free, DB-free, unit-tested first like
`lib/delivery.ts`:

- `studioElapsed(startISO: string, now: Date): { days; hours; minutes; seconds; totalMs }`
  — clamps negatives to zero (never show a future start as negative).
- `formatStudioElapsed(parts): string` — `"2d 06h 14m 32s"`; drops the leading
  `0d` below a day (`"06h 14m 32s"`) and the hours below an hour
  (`"14m 32s"`). Tabular figures so it doesn't jitter.
- `formatStudioElapsedCoarse(parts): string` — `"2 days"` / `"about 5 hours"` /
  `"under an hour"`, for reduced-motion and the screen-reader label.

## 5. Copy (passed the brand-voice guide)

Reuses the existing `heroName()` pattern from `lib/order-stages.ts` so the child
stays central even with no name.

- **Headline:** `In the studio now`
- **Counter, with name:** `crafting {Name}'s story for {formatStudioElapsed}`
- **Counter, no name:** `crafting your child's story for {formatStudioElapsed}`
- **Reduced-motion counter:** same prefix, coarse value —
  `crafting {poss} story for {formatStudioElapsedCoarse}`
- **Screen-reader (sr-only) label:** `In the studio, crafting since {Month Day}.`
- **Ready-by sub-line:** `We expect it ready by {formatPromisedDate}.` (reused
  from `lib/delivery.ts`)
- **Overdue line:** reuse the existing on-brand copy — `The final touches are
  taking a little longer than we hoped. It will be worth the wait.`

Sentence case, calm, no SFX, no em-dashes, no exclamation points.

## 6. Reduced motion & accessibility

- `useReducedMotion()` gates **all** autonomous motion:
  - mascot → still PNG (already handled inside `MascotImage`);
  - pulse dot → rendered static (no ring keyframe);
  - counter → **does not tick**; renders the coarse static form once
    (`formatStudioElapsedCoarse`). No `setInterval` is started under reduced
    motion.
- The ticking number is `aria-hidden`. A `sr-only` span carries the stable
  sentence (`In the studio, crafting since {date}.`) so screen readers get one
  calm fact, not a per-second barrage.
- The container is **not** an `aria-live` region.
- The interval is cleared on unmount; optionally paused on
  `document.hidden` via `visibilitychange` (nice-to-have, not required).

## 7. Edge cases

- **Overdue** (now past `promisedBy`): detect with `countdownState(...)` from
  `lib/delivery.ts` (`kind === "overdue"`). When overdue, swap the ticking
  counter for the gentle reassurance line and drop the date — never show a big
  "crafting for 25 days". The mascot stays.
- **No `promisedBy`:** show the counter, omit the ready-by line; `countdownState`
  is only consulted for the date string and the overdue flag.
- **No `inStudioSince` (legacy):** fall back to `createdAt`.

## 8. Testing

- `tests/lib/studio-elapsed.test.ts` (write first, must fail): boundaries — `0s`,
  `59s → 1m 00s` rollover, exactly `1d`, multi-day; format shortening below a
  day and below an hour; coarse forms; negative/future start clamps to zero.
- Stamp coverage:
  - extend `tests/stripe/webhook.test.ts` — `inStudioSince` is stamped when
    photos attach at checkout (and absent when they don't);
  - `applyOrderStatusCore` stamps on first `in_production` and does **not** reset
    it on a later `in_production` re-entry;
  - the customer upload auto-advance stamps it.
- Light component render: `StudioLiveCard` renders for `in_production`, and the
  page shows it instead of `DeliveryCountdown` for `in_production` / `revisions`.

## 9. Mind maintenance (done in the same change)

- Re-stamp the **`auth-gating`** zone card (the order detail page + customer
  components live there); add `components/app/studio-live-card.tsx`,
  `lib/studio-elapsed.ts`, and the `inStudioSince` field to its sources; bump
  `verifiedAt` to HEAD.
- Add a decision record `map/decisions/2026-06-16-in-studio-live-card.md`
  reconciling the **count-up seconds** here with the deliberate
  **days-granularity** delivery decision: they are complementary, not in
  conflict — this clock is *elapsed since production started*, not a countdown to
  delivery, and it collapses to days under reduced motion. The
  `delivery-promise-auto-from-length` decision is **not** superseded (it still
  governs the ready-by promise, which this card displays).
- Run `npm run mind`, commit the regenerated `map/index.md`.

## 10. Out of scope

- No change to the delivery-promise math or the `promisedBy` stamp.
- No change to `DeliveryCountdown` itself.
- No new mascot art (reuse `builder-360.webp` / `builder-static.png`).
- The unrelated no-photo-checkout dashboard-upload gap (flagged separately).
