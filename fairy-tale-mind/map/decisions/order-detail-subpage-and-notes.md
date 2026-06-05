---
type: decision
summary: "Each order has its own owner-scoped detail page at /app/orders/[id]. The parent can append free-text notes to the studio (never edit their order config), at ANY status, stored as an append-only customerNotes thread shown back to them and visible to the studio in /admin. The dashboard list became link cards and the per-status actions moved to the detail page."
tags: [customer-area, auth, product]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[auth-gating]]", "[[payload-backend]]"]
sources: ["[[2026-06-04-order-detail-subpage-design]]"]
decided: 2026-06-04
supersededBy: ""
---

## Context
The `/app` dashboard listed orders as cards with the timeline, a status message,
and the per-status action all inline. There was no way to open a single order, and
no channel for a parent to tell the studio something after checkout ("she has a
little brother Max", "please make the dragon friendly"). The owner wanted a
per-order page plus a way to "add more information / change details" that saves to
Payload.

## Decision
Three choices, confirmed with the owner during brainstorming:

1. **Notes only, not config editing.** The form appends free-text **notes to the
   studio**; it does NOT let the parent edit their original order configuration
   (child name, world, plot, etc.). Those stay read-only on the page. Editing a
   paid, possibly in-production order's config is risky and out of scope.
2. **Always available.** Notes can be added at ANY status, even after delivery —
   no stage lock. Calm and forgiving; a late note is just visible to the studio.
3. **Stored on the order, shown back.** A new append-only `customerNotes` array
   (`{ message, createdAt }`) on the Orders collection. The parent sees their own
   thread on the detail page; the studio sees it inline in `/admin`.

Structurally: a new owner-scoped route `/app/orders/[id]` (under the `(app)` gate)
reads via `getOrderForCurrentCustomer` (404 on non-owned/unknown id) and is the
single home for one order — so the **dashboard list became compact link cards**
and the **per-status actions (upload / proof / video) moved to the detail page**.
With no interactive controls left inside a card, the whole card is one `<Link>`
(lift via `group-hover` on the stable `<li>`, no edge-jitter). The note write is a
new ownership-guarded action `addOrderNote` (the same `assertOwnsOrder` doorway);
it never changes status.

## Consequences
- New owner-scoped single-order read `getOrderForOwner` (id + owner in one
  `where`) — the detail page's security boundary; unit-tested.
- The three existing per-status actions now revalidate the detail path too, so
  acting from the detail page refreshes it.
- `MAX_NOTE_LENGTH` + `AddNoteResult` live in `lib/order-notes-shared.ts` because a
  `"use server"` file can't export non-functions (re-exporting a type through it
  breaks `next build` under Next 16).
- The studio is NOT actively notified when a note lands — it only appears in
  `/admin`. Tracked as `[[studio-not-notified-of-customer-notes]]`.
- The parent still can't self-serve config changes; if they need one they leave a
  note and the studio edits in `/admin`.
