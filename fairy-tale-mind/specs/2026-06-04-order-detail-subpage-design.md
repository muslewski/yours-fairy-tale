# Order detail subpage + studio notes — design

> **Status:** approved 2026-06-04.

**Goal:** Give every order its own owner-scoped page at `/app/orders/[id]` where the
parent sees the full picture, and let them append free-text notes to the studio from a
dialog — saved on the order in Payload and shown back to them.

## Decisions (from brainstorming)

- **Form scope:** append-only **notes to the studio** only. The parent does NOT edit their
  original order config — those fields stay read-only.
- **When allowed:** **always**, at any status, even after delivery. No stage lock.
- **Storage + visibility:** a `customerNotes` array on the order (`{ message, createdAt }`),
  shown back to the parent as a chronological thread on the detail page; the studio sees it
  inline in `/admin`.

## Route & gating

- New route `app/(app)/app/orders/[id]/page.tsx` — under the `(app)` group, so it inherits
  the authoritative session gate (`app/(app)/app/layout.tsx`) and the public chrome
  (`<SiteNav signedIn/>` + `<SiteFooter/>`). No new gate code.
- Owner-checked on read: only the order's owner can open it. A non-owned / unknown id →
  `notFound()`.

## Components & data flow

### 1. Dashboard list → links (`app/(app)/app/page.tsx`)

The order cards become compact, clickable summaries that link to their detail page:
title · world · status timeline · status **headline**. The per-status **actions**
(`PhotoUpload` / `ProofReview` / `VideoPlayer`) and `loadProof` **move off the list and onto
the detail page** — one clear home per order. With no interactive controls left inside the
card, the whole card becomes a `<Link>`; the lift is `group-hover:shadow-comic-lg` on the
stable `<li>` (no movement on the hover target → no edge-jitter).

### 2. Detail page (`app/(app)/app/orders/[id]/page.tsx`, server component)

Reads the order via `getOrderForCurrentCustomer(id)` (below); `notFound()` if null. Renders:

- Header: `"{Child}'s fairy tale"` + world label; a "← Back to your videos" link to `/app`.
- Status timeline (when on the happy path) + the full status message (headline + body), via
  the existing `stageForStatus` / `messageForStatus` (`lib/order-stages.ts`).
- The per-status **action slot** — the relocated `PhotoUpload` / `ProofReview` (with
  `loadProof`) / `VideoPlayer`.
- **"Your story"** read-only panel: world, length, detail level, extra minutes, add-ons, and
  their original `plotNote`. Length/detail-level use label maps mirroring the `Orders.ts`
  select options.
- **"Notes for our studio"** panel: the `OrderNotes` client island.

### 3. Notes thread + dialog (`components/app/order-notes.tsx`, client island)

- Renders existing `customerNotes` as a chronological log (message + friendly absolute date
  via `toLocaleDateString`). Calm empty state when there are none.
- An "Add a note" button opens a Motion modal (`useReducedMotion`-guarded; Escape and
  backdrop click close it): a textarea + "Send to the studio". Submitting calls the
  `addOrderNote` server action; on success the dialog closes and the thread re-renders.
- Client-side guard: trim, require non-empty, enforce the same max length the action does.

### 4. Data model (`collections/Orders.ts`)

Add one field:

```ts
{
  name: "customerNotes",
  type: "array",
  admin: { description: "Notes the parent added from their order page." },
  fields: [
    { name: "message", type: "textarea", required: true },
    { name: "createdAt", type: "date", admin: { readOnly: true } },
  ],
}
```

### 5. Server action (`lib/order-actions.ts`) — `addOrderNote(orderId, message)`

- Begins with `assertOwnsOrder(orderId)` — the single mutation doorway (do not bypass).
- Validates: trimmed message non-empty, length ≤ MAX (e.g. 2000). Returns a typed result
  `{ ok: true } | { ok: false, error }` so the dialog can surface a message.
- Appends `{ message: trimmed, createdAt: new Date().toISOString() }` to the existing
  `customerNotes`, preserving prior rows (mirrors how `uploadOrderAssets` preserves `assets`).
- `revalidatePath('/app/orders/' + orderId)`.
- Does NOT change `status`.

### 6. Owner-scoped read (`lib/customer-data.ts`)

Add, mirroring the explicit-`where` + `overrideAccess` pattern already there:

- `getOrderForOwner(ownerId, orderId)` → the order doc, or `null` if it does not exist or is
  owned by someone else (query `where: { and: [{ id: { equals } }, { owner: { equals } }] }`).
- `getOrderForCurrentCustomer(orderId)` → composes the session + `getOrderForOwner`; `null`
  when unauthenticated.

### 7. Label maps

Small `LENGTH_LABELS` / `DETAIL_LEVEL_LABELS` maps (mirroring the `Orders.ts` select
options) for the "Your story" panel. Co-locate with the existing order helpers.

## Testing

- Unit/integration (vitest, DB-backed): `getOrderForOwner` returns the doc for the owner and
  `null` for a non-owner / unknown id; `addOrderNote` rejects a non-owner, rejects
  empty/oversized messages, and appends a row preserving prior notes.
- E2E (`e2e/dashboard.spec.ts`, Layer B): from the dashboard, click an order into its detail
  page, open the dialog, add a note, see it appear in the thread.

## Out of scope (deferred)

- The parent editing their order config (notes-only by decision).
- Emailing the studio when a note lands — it is visible in `/admin`. File as a follow-up.

## Verify

- `npx tsc --noEmit` 0; `npm run build` succeeds.
- Browser: sign in, open `/app`, click an order → detail page shows full details + actions +
  notes panel; add a note → it appears and persists; a non-owned id → 404.

## Mind maintenance (on finish)

- Update `[[auth-gating]]` (owner-scoped reads now include single-order fetch) and document
  the new route/notes thread. Add a `map/decisions/` record for the notes-only + always-open
  choice. Re-stamp touched zones' `verifiedAt`. File the studio-email follow-up under
  `tech-debt/`. Run `npm run mind`.
