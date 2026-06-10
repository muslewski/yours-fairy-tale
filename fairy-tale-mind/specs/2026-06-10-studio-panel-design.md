---
type: spec
summary: "A branded staff panel at /studio for the two-person team: revenue totals, a needs-attention order queue, a full per-order workstation (status, uploads, notes, delivery promise), browser-to-Blob video uploads, a customer-facing delivery countdown, and the builder mascot."
tags: []
status: planned
created: 2026-06-10
updated: 2026-06-10
related: []
sources: []
origin: "brainstorming 2026-06-10"
---

# The Studio — staff order-management panel

**Date:** 2026-06-10
**Status:** Approved (brainstorming), ready for implementation plan

## Summary

A staff-only section of the site at `/studio` where the two-person team (owner +
artist) manages everything transactional about orders: how much money came in,
which orders need a next step, and the full per-order workflow from "paid" to
"delivered" — including uploading the proof and final film. It wears the same
brand chrome as the customer `/app` area (cream background, comic-shadow cards,
Fredoka headings), not Payload's gray admin. Payload `/admin` remains the
fallback tool and the home for content/media browsing and account admin.

Two customer-visible features ride along:

1. **Delivery promise.** Every order gets a "promised by" date (auto from film
   length, studio-adjustable). The parent sees a calm countdown ring on their
   order page.
2. **The builder mascot.** The animated builder GIF (compressed to animated
   WebP) appears in three deliberate places.

### Decisions locked in brainstorming

- **Scope: full order workstation.** Status changes, proof/final uploads, and
  customer notes all live in `/studio`; the team should not need `/admin` for
  day-to-day order work.
- **Money: simple totals.** All-time, this calendar month, last 30 days. No
  charts, no breakdowns. Stripe dashboard link for anything deeper.
- **Architecture: approach A** — a route group inside this Next.js app, gated
  by the existing Payload `admins` auth. No new auth system, no Payload admin
  customization, no separate app.
- **ETA: auto from film length with per-order override.** Defaults: short
  +7 days, medium +14 days, long +21 days from order creation.
- **Mascot: reuse the builder GIF**, compressed; original stays out of git.

## Routes and gating

| Route | Purpose |
|---|---|
| `/studio` | Dashboard: revenue cards, needs-attention queue, in-the-works list, quick links |
| `/studio/orders` | Full order list, filterable by status |
| `/studio/orders/[id]` | The order workstation |
| `/studio/sign-in` | Branded staff sign-in (outside the gated layout) |

- **Gate:** a layout around all gated `/studio` pages resolves the request's
  Payload session via the Local API (`payload.auth({ headers })`) and requires
  a user from the `admins` collection. Anything else redirects to
  `/studio/sign-in`. Customer (Better Auth) sessions use a different cookie
  namespace and can never pass this gate — same two-cookie coexistence already
  documented in [[auth-gating]].
- **Sign-in:** a small branded form posting email + password to Payload's
  existing REST login endpoint (`/api/admins/login`), which sets the same
  `payload-token` cookie `/admin` uses. Sign in once, both `/admin` and
  `/studio` work. No sign-up path, no password reset UI (use `/admin`'s).
- **Robots:** `/studio` is excluded from indexing (metadata `robots: noindex`
  + disallowed in `robots.ts`), belt and braces on top of the auth gate.
- Server actions and route handlers backing studio mutations **re-verify the
  admins session server-side on every call**. The UI is never the security
  boundary.

## Data model changes (orders collection + migration)

1. `amountTotalCents` (number, optional) — what Stripe actually charged.
   Set by the checkout webhook from `session.amount_total` when Stripe
   provides it (it stays `null` otherwise). Never recomputed from pricing
   config (prices can change; the charge is history).
2. `promisedBy` (date, optional) — the delivery promise shown to the parent.
   Set by the webhook at order creation: `createdAt + productionDays(length)`
   with defaults short = 7, medium = 14, long = 21 days, defined as exported
   constants beside the pricing model (single source of truth, unit-testable).
   An order with no recorded length gets no automatic promise (`null`); the
   studio can set one by hand. Studio can override per order.

One migration adds both columns. Existing orders keep `null` for both:
- `amountTotalCents: null` counts as $0 in revenue totals; when any such order
  exists the dashboard shows a footnote ("older orders without recorded
  amounts are not counted").
- `promisedBy: null` simply shows no countdown to the customer.

Webhook (`app/api/stripe/webhook/route.ts`, [[checkout]]) gains both fields on
order create. The order confirmation email gains one line: "We expect it to be
ready by Friday, June 20."

## Dashboard (`/studio`)

**Revenue cards** (3): all time · this calendar month · last 30 days. Each
shows the dollar total and the film count. Definition: sum of
`amountTotalCents` over orders whose status is **not** `refunded` and **not**
`cancelled` (a dispute means the money is gone). Refunds subtract by exclusion;
partial refunds are out of scope (the webhook already flips the whole order to
`refunded`).

**Needs your attention** — orders whose next move is the studio's, oldest
first:

| Status | Chip label | Why it needs you |
|---|---|---|
| `paid` | New order | Start production or request photos |
| `revisions` | Changes requested | Parent asked for a change (snippet of `revisionNote` shown on the card) |
| `approved` | Ready to deliver | Parent approved the proof; render and deliver the final film |

**In the works** — compact list of moving orders that are someone else's turn
or already in progress: `awaiting_assets` ("waiting for photos"),
`in_production`, `proof_ready` ("with the parent").

**Quick links** — Stripe dashboard (`https://dashboard.stripe.com/`), Payload
`/admin`. Each order row links to its workstation; each order's payment links
to `https://dashboard.stripe.com/payments/<paymentIntentId>` when present.

Empty attention queue shows the builder mascot waving: "All caught up. Nothing
needs you right now."

## Order list (`/studio/orders`)

All orders, newest first, with status chips, child name, world, length, amount,
and age. Filter by status (chips across the top). Payload pagination (page
param); no search at launch — volume is tiny and the list is filterable.

## Order workstation (`/studio/orders/[id]`)

Two-column layout (approved mockup):

**Left — what they ordered (read-only):**
- Story card: world, length, detail level, add-ons, extra minutes, plot note.
- Header: child's name, owner email, order date, status chip, amount, "view in
  Stripe" link.
- Their photos: thumbnails of `assets` media; click to view/download.
- Notes from the parent: `customerNotes` thread (read-only) with the active
  `revisionNote` highlighted. Replies happen over email; no two-way chat.

**Right — the work:**
- **Workflow card:** current position in the status pipeline, plus:
  - *Next-step buttons* per status (see table below).
  - *Set any status* fallback select for odd cases.
  - *Promised by* date field with quick presets (+1 week / +2 weeks from
    today, i.e. the moment the studio clicks, not from the order date).
- **Preview film slot:** current proof (player + filename + replace), or upload.
- **Final film slot:** same for `finalVideo`. Microcopy notes that marking the
  order delivered emails the parent automatically.

**Status transition map** (buttons offered per current status):

| Current | Offered next steps |
|---|---|
| `paid` | Request photos (`awaiting_assets`) · Start production (`in_production`) |
| `awaiting_assets` | Start production (`in_production`) |
| `in_production` | Share the proof (`proof_ready`) ⚑ |
| `proof_ready` | (with the parent — no studio action; fallback select available) |
| `revisions` | Back to production (`in_production`) · Share a new proof (`proof_ready`) ⚑ |
| `approved` | Mark delivered (`delivered`) ⚑⚑ |
| `delivered`, `refunded`, `cancelled` | terminal; fallback select only |

Guardrails (server-enforced, not just disabled buttons):
- ⚑ `proof_ready` requires a `proof` attached.
- ⚑⚑ `delivered` requires a `finalVideo` attached.

The existing `afterChange` hook on orders keeps firing unchanged — moving to
`proof_ready` or `delivered` emails the parent exactly as it does from
`/admin` today. Refunds/disputes continue to come only from the Stripe webhook.

## Video uploads (browser → Vercel Blob)

Vercel caps request bodies through the server at ~4.5MB; final films are
hundreds of MB. Uploads therefore go **directly from the browser to Vercel
Blob**:

1. Studio picks a file; the client requests a short-lived client-upload token
   from our route handler (`handleUpload` from `@vercel/blob/client`). The
   handler verifies the admins session in `onBeforeGenerateToken` and
   constrains pathname + content type.
2. The browser streams the file straight to Blob under a unique pathname
   (`<orderId>-<proof|final>-<timestamp>.<ext>` — flat, matching the
   plugin's pathname == filename convention from [[payload-backend]]).
3. The client then calls a server action `attachUploadedVideo({ orderId, kind,
   pathname })` which re-verifies the admin session, confirms the blob exists
   via `head(pathname)` (size + content type), creates the `media` doc
   referencing that filename, and links it to the order's `proof`/`finalVideo`.
4. Replacing a video creates a new media doc and relinks; the old blob is left
   orphaned (harmless, invisible). A tech-debt note covers eventual cleanup.

Supporting changes:
- The `media` collection allows metadata-only creation for this flow
  (`upload.filesRequiredOnCreate: false` — **verify exact mechanism against
  vendored Payload source during planning**; if it misbehaves, fall back to a
  dedicated `videos` collection configured for it).
- The Vercel Blob storage plugin also gets `clientUploads: true` so `/admin`
  uploads stop being capped at 4.5MB too — without this, large-film delivery
  doesn't work anywhere on Vercel.
- **Local dev without a Blob token:** the panel falls back to a plain
  server-side upload (no body cap locally), mirroring the existing dual-path
  convention in `lib/video-access.ts`.

## Delivery promise (customer-facing countdown)

On the parent's order page (`/app/orders/[id]`, [[auth-gating]]): a card with
a ring showing **days remaining** and the promised date.

Display rules:
- Days granularity, no ticking clock. Under one day: "ready very soon".
- Past the date and not delivered: the calm variant — ring stays full,
  no negative numbers, no red.
- Hidden when `promisedBy` is null and for `delivered` / `refunded` /
  `cancelled` orders.
- Ring is decorative SVG; respects `prefers-reduced-motion` for any entrance
  animation; real values rendered server-side (no layout shift).

Copy (brand-voice checked; American English, sentence case, no em-dashes):
- On track: **"Theo's film is on its way"** / "We expect it ready by
  Friday, June 20."
- No child name: "Your film is on its way".
- Overdue: **"Nearly finished"** / "The final touches are taking a little
  longer than we hoped. It will be worth the wait."
- Confirmation email line: "We expect it to be ready by Friday, June 20."

## The builder mascot

Source: a 1284×716, 127-frame, 9.8MB transparent GIF (kept **out of git**; the
original currently sits at the worktree root as `builder-mascot-original.gif`
and in `/tmp/fairy-assets/`). Committed assets (in `public/mascot/`), produced
with ffmpeg (recipe below, verified working in this sandbox):

| File | Use | Measured size |
|---|---|---|
| `builder-360.webp` | Studio (empty queue, sign-in) | ~1.1MB |
| `builder-240.webp` | Customer ETA card | ~469KB |
| `builder-static.png` | Reduced-motion + poster fallback | ~79KB |

```sh
ffmpeg -i builder.gif -vf "crop=in_h*0.62:in_h:(in_w-in_h*0.62)/2:0,scale=-2:360:flags=lanczos,fps=15" \
  -c:v libwebp -lossless 0 -q:v 75 -loop 0 -an builder-360.webp
ffmpeg -i builder.gif -vf "crop=in_h*0.62:in_h:(in_w-in_h*0.62)/2:0,scale=-2:240:flags=lanczos,fps=12" \
  -c:v libwebp -lossless 0 -q:v 60 -loop 0 -an builder-240.webp
ffmpeg -i builder.gif -vf "crop=in_h*0.62:in_h:(in_w-in_h*0.62)/2:0,scale=-2:360:flags=lanczos" \
  -frames:v 1 builder-static.png
```

Placements — exactly three, so he stays delightful:
1. Customer ETA card (both on-track and overdue variants).
2. Studio dashboard empty attention queue.
3. Studio sign-in page.

Rules: `prefers-reduced-motion` swaps in the static PNG (client component
checks the media query; server renders static by default to avoid a flash);
`loading="lazy"`, explicit width/height (no layout shift); plain `<img>` (Next
image optimization does not apply to animated images).

## Error handling

- Mutations return `{ ok, error }`; failures show a calm inline message and
  change nothing. Error copy follows the brand pattern ("Something went wrong
  while saving. Please try again in a moment.").
- Upload failures are safely retryable (fresh pathname each attempt).
- Revenue/footnote behavior for null amounts as specified above.
- Guardrail violations (e.g. delivered without a final film) return a clear
  message; the server, not the UI, enforces them.

## Testing

House pattern ([[testing]]): vitest DB-backed unit/integration + Playwright.

- **Unit/integration:** revenue aggregation (statuses, calendar month
  boundaries, null amounts); needs-attention picker (statuses + ordering); ETA
  defaults per length; webhook persists `amountTotalCents` + `promisedBy`;
  status-transition guardrails; `attachUploadedVideo` rejects missing blobs.
- **Authorization:** anonymous and customer-session callers are rejected by
  the studio gate and by every studio server action; non-admin cannot mint an
  upload token.
- **Playwright (Layer B):** seed an admin; sign in at `/studio/sign-in`; see
  the dashboard with a seeded order in the attention queue; open the
  workstation; advance status; verify the customer order page reflects the
  change and shows the countdown.

## Out of scope (deliberate)

- Replying to customer notes from the studio (email instead).
- Charts, average order value, per-world breakdowns.
- Partial refunds, manual refund initiation (Stripe dashboard owns refunds).
- Staff email notifications on new orders.
- Search in the order list; roles/permissions beyond "is an admin".

## Addendum (planning discovery): customer proof playback is broken today

Found while planning: `components/app/proof-review.tsx` plays the proof from
`proof.url` — Payload's `/api/media/file/<filename>` endpoint, which the
`media` collection gates with `read: adminOnly`. A real parent (Better Auth
session, not a Payload admin) gets a 403 in every environment, so the proof
review loop has never worked for customers. The studio panel makes this loop
load-bearing, so the fix ships with it: `resolveOwnedVideo` gains a
`field: "finalVideo" | "proof"` parameter, the gated route accepts
`?kind=proof`, and `ProofReview` points at that route instead of `proof.url`.
Ownership-gated, same pattern as the delivered film.

## Risks on record

1. **Browser-to-Blob upload integration** is the one piece with real
   integration risk (token route, metadata-only media creation). Fallback if
   it fights us: upload via `/admin` (which gains `clientUploads: true`
   regardless), panel deep-links there. Verify plugin internals against
   vendored source before implementation.
2. **Revenue counts from this change forward.** Pre-existing orders show as $0
   with a footnote. Acceptable: launch has not happened yet.
3. **The ETA is a promise to a paying parent.** The workstation surfaces
   promised-by dates prominently (and the attention queue keeps slow orders
   visible) so dates do not sneak past.
4. `payload.auth({ headers })` for the admins cookie and the REST login from a
   custom page are assumed stable Payload v3 surfaces — verify both against
   the vendored Payload source during planning (same discipline as the
   Better Auth adapter work).
