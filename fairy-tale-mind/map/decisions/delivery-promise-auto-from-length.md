---
type: decision
summary: "Every order gets a promisedBy date at purchase, derived from film length (short +7d / medium +14d / long +21d in lib/delivery.ts); the studio can override per order. The parent sees a calm days-granularity countdown (overdue variant, never negative numbers), and the confirmation email includes the expected-by date."
tags: [studio, orders, customer-area, ux]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[studio]]", "[[checkout]]", "[[auth-gating]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-studio-panel.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
Parents had no idea when their film would arrive — the status timeline shows
progress but not a date, and "keepsake, made with care" loses its calm if the
wait feels open-ended. The studio needed a promise it controls; the customer
needed a date that never alarms.

## Decision
- **Automatic promise at purchase**: the Stripe webhook stamps `promisedBy` on
  every new order via `promisedByForLength(length, now)` — `short` +7 days,
  `medium` +14, `long` +21. The windows live ONLY in `PRODUCTION_DAYS` in
  `lib/delivery.ts` (pure date math, no React/DB; deliberately conservative —
  tune as the real production pace becomes known). Unknown/missing lengths get
  no automatic promise; the studio can set one by hand.
- **Studio overrides per order**: the workstation's promised-by editor
  (`setPromisedBy`) can move or clear the date at any time.
- **Customer sees a calm countdown**: `countdownState` in `lib/delivery.ts`
  drives the `DeliveryCountdown` card on the order detail page — **days**
  granularity (no ticking clock), a gentle overdue variant ("taking a little
  longer") instead of negative numbers, hidden once delivered and on
  refunded/cancelled orders.
- **The confirmation email includes the date** ("We expect it to be ready
  by …") via `formatPromisedDate`, only when a promise was stamped.

## Why
- A date set at purchase makes the promise a system property, not a thing the
  studio must remember to do — and `amountTotalCents`-style storage (stamped
  once, read forever) means the customer's date never silently shifts if the
  defaults are later tuned.
- Days granularity + the no-negative-numbers rule are brand voice as code: a
  countdown that ticks seconds or shows "-3 days" reads like a shipping
  tracker, not a keepsake studio.
- Length is the honest driver of effort; three conservative windows beat a
  falsely precise estimate.

## Consequences
- `promisedBy` joined the orders schema (migration
  `20260610_000001_order_amount_promise`, together with `amountTotalCents`).
- The studio's attention queue can use the promise to surface orders running
  close to their date.
- `tests/lib/delivery.test.ts` pins the date math and every countdown state;
  `tests/stripe/webhook.test.ts` pins the stamp at order creation.
