---
type: zone
summary: "The staff order panel at /studio — dashboard (revenue totals, needs-attention queue), order list, and a per-order workstation (status workflow with guardrails, delivery promise, browser-to-Blob video uploads), gated by the Payload admins login. Same brand chrome as the customer area; Payload /admin remains the fallback tool."
tags: [studio, staff, orders, security, video]
status: active
created: 2026-06-10
updated: 2026-06-16
related: ["[[payload-backend]]", "[[auth-gating]]", "[[checkout]]", "[[studio-gate-reuses-payload-admins-auth]]", "[[browser-to-blob-uploads-metadata-media]]", "[[delivery-promise-auto-from-length]]", "[[orphaned-blobs-no-cleanup]]", "[[2026-06-16-in-studio-live-card]]", "[[2026-06-17-studio-delivery-link]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-studio-panel.md"
  - "fairy-tale-mind/specs/2026-06-10-studio-panel-design.md"
owns:
  # /studio routes live behind a (gated) route group + a dynamic segment, which
  # the Mind generator's routeExists can't resolve — tracked via globs instead
  # (same pattern as auth-gating and payload-backend).
  routes: []
  anchors: []
  globs:
    - "app/(site)/studio/**"
    - "lib/studio-auth.ts"
    - "lib/studio-data.ts"
    - "lib/studio-workflow.ts"
    - "lib/studio-actions.ts"
    - "lib/studio-order-mutations.ts"
    - "lib/studio-status.ts"
    - "lib/date-guard.ts"
    - "lib/delivery.ts"
    - "lib/delivery-url.ts"
    - "lib/blob-upload-options.ts"
    - "components/studio/**"
    - "tests/studio/*"
    - "tests/lib/delivery.test.ts"
    - "tests/lib/delivery-url.test.ts"
    - "tests/lib/blob-upload-options.test.ts"
    - "tests/lib/studio-status.test.ts"
    - "tests/lib/date-guard.test.ts"
    - "e2e/studio.spec.ts"
depends: ["[[payload-backend]]"]
invariants:
  - rule: "Every studio read and mutation independently checks the admin session — the (gated) layout is only a navigation gate (layouts do not re-run on client-side transitions). Reads/pages use requireStudioUser (throws); the 'use server' mutation ACTIONS use requireStudioUserOrRedirect, which bounces an expired/missing session to /studio/sign-in instead of throwing a raw Error that Next surfaces as a generic 500."
    enforcedBy: ["tests/studio/auth.test.ts", "tests/studio/auth-redirect.test.ts"]
  - rule: "Auth-skipping cores live in lib/studio-order-mutations.ts, NEVER exported from the 'use server' module — every export of a 'use server' file is a POST-reachable server action."
    enforcedBy: ["tests/studio/actions.test.ts"]
  - rule: "proof_ready requires a proof attached OR an external delivery link (proofUrl); delivered requires the final film OR a delivery link (finalVideoUrl) — server-enforced in applyOrderStatusCore, not just disabled buttons. The link is an https-validated paste (lib/delivery-url.ts) that can stand alone as the delivery or back up an upload."
    enforcedBy: ["tests/studio/actions.test.ts"]
  - rule: "Video bytes never pass through the server in Blob mode; media docs for studio uploads are metadata-only with filename == blob pathname (what the playback proxy's head(filename) resolves)."
    enforcedBy: ["tests/studio/attach-video.test.ts"]
  - rule: "Revenue sums Stripe-charged cents (amountTotalCents) excluding refunded/cancelled; never recomputed from pricing."
    enforcedBy: ["tests/studio/workflow.test.ts"]
verifiedAt: ad57454
---

## Purpose
The staff order panel at `/studio` — the daily production tool for the two-person
studio. It wears the same brand chrome as the customer area (comic cards, brand
tokens, the builder mascot) and is gated by the **Payload `admins` login** — the
same account as `/admin` (see `[[studio-gate-reuses-payload-admins-auth]]`).
Payload `/admin` remains the raw fallback tool for anything the panel doesn't do.

### Auth (lib/studio-auth.ts)
The single doorway for "who is the staff member on this request":
`getStudioUserFromHeaders(h)` resolves the payload-token cookie via the Local API
(`payload.auth`) and returns the user ONLY if they come from the `admins`
collection — customer (Better Auth) sessions live in a different cookie namespace
and resolve to null. `requireStudioUser()` throws unless staff and opens the data
reads; the `use server` mutation actions instead call `requireStudioUserOrRedirect()`,
which bounces an expired/missing session to `/studio/sign-in` (the same graceful
redirect the layout gives page GETs) rather than throwing a raw Error that Next
surfaces as a generic 500. The `(gated)` layout redirects too, but it is ONLY a
navigation gate — the data layer and the actions are the security boundary.

### Shell + sign-in (app/(site)/studio/layout.tsx, app/(site)/studio/sign-in)
`noindex` metadata (plus `/studio` in robots disallow, see `[[app-shell]]`), a
branded sign-in page posting email/password to Payload's own login, and a compact
studio nav (`components/studio/studio-nav.tsx`) with sign-out.

### Dashboard (app/(site)/studio/(gated)/page.tsx)
Revenue cards (this month / all time, summed from `amountTotalCents` — never
recomputed from `lib/pricing.ts`, which can drift from what was actually
charged), a needs-attention queue (orders whose next move is the studio's), and
quick links.

### Order list + workstation (app/(site)/studio/(gated)/orders, orders/[id])
The list filters by status chips. The per-order workstation shows the story
panel, the parent's photos, the notes thread, and:
- **Status workflow** (`components/studio/workflow-card.tsx` →
  `setOrderStatus`) — guardrails server-enforced in
  `applyOrderStatusCore`: `proof_ready` requires a proof attached, `delivered`
  requires the final film. Status changes go through the Payload Local API so
  the Orders afterChange hook still fires (proof_ready/delivered email the
  parent exactly as from /admin).
- **Delivery promise** (`components/studio/promised-by-editor.tsx` →
  `setPromisedBy`) — view/override/clear the `promisedBy` date stamped at
  purchase (see `[[delivery-promise-auto-from-length]]`).
- **Video uploads** (`components/studio/video-upload.tsx`) — proof + final film
  go browser → Vercel Blob via `@vercel/blob/client` `upload()` against the
  token route `app/(site)/studio/api/blob-upload/route.ts` (admin check inside
  `onBeforeGenerateToken` — route handlers do NOT inherit the layout gate),
  then the client calls `attachUploadedVideo` to create a METADATA-ONLY media
  doc (`filesRequiredOnCreate: false`) whose `filename` == the blob pathname —
  exactly what the customer playback proxy's `head(filename)` resolves. The
  server never sees the bytes (Vercel caps request bodies at ~4.5MB; films are
  hundreds of MB). See `[[browser-to-blob-uploads-metadata-media]]`.
  `uploadVideoDirect` is the small-file/dev fallback when Blob is disabled.

### Module layering (the security split)
- `lib/studio-workflow.ts` — pure core (no React/DB/Next): status chips +
  tones, allowed transitions, attachment requirements, attention queue,
  revenue windows, `formatAge`.
- `lib/studio-data.ts` — guarded reads (`getAllOrders`, …); each helper calls
  `requireStudioUser()` itself.
- `lib/studio-actions.ts` (`"use server"`) — ONLY guarded actions; each begins
  with `requireStudioUser()` and revalidates both the studio and customer paths.
- `lib/studio-order-mutations.ts` (NOT `"use server"`) — the auth-skipping
  cores (`applyOrderStatusCore`, `applyPromisedByCore`, `attachVideoCore`),
  quarantined so the Next compiler can never register them as POST-reachable
  actions (a security review caught this; see the decision record).
  Moving an order to `in_production` stamps `orders.inStudioSince` once (never
  reset), via the pure `lib/in-studio-stamp.ts`; see `[[2026-06-16-in-studio-live-card]]`.

## Tests
- `tests/studio/auth.test.ts` — the admins-only bridge: a real admins token
  resolves, a Better Auth cookie / no cookie / wrong collection resolve null;
  `requireStudioUser` throws (the drift guard on `collection !== "admins"`).
- `tests/studio/workflow.test.ts` — pure core: transitions, requirements,
  attention queue, revenue-window inclusivity, formatAge buckets.
- `tests/studio/actions.test.ts` — DB-backed guardrails: proof_ready without a
  proof / delivered without the film reject and leave the order unmutated;
  happy paths advance; promise set/clear.
- `tests/studio/attach-video.test.ts` — metadata-only media doc with
  filename == blob pathname, linked as proof/finalVideo.
- `tests/lib/delivery.test.ts` — promise math + countdown states.
- `e2e/studio.spec.ts` (Layer B, DB-seeded via `seedAdmin`) — gate bounce,
  sign-in, queue, status advance through the real UI.

## Lineage
Built 2026-06-10 from the studio-panel plan
(`fairy-tale-mind/plans/2026-06-10-studio-panel.md`): auth bridge → pure
workflow core → guarded mutations (with the "use server" quarantine fix) →
shell + sign-in → dashboard → order list → workstation → browser-to-Blob
uploads → the customer-facing delivery countdown + proof-playback fix (owned by
`[[auth-gating]]`) → Layer B e2e.
Pre-launch polish (2026-06-16, Phase 5): a confirm step before destructive transitions
(`isDestructiveStatus` in `lib/studio-status.ts` gates cancelled/refunded in
`workflow-card.tsx`); in-flight "Saving…" + `aria-busy` on the workflow + promised-by
buttons; a past-date guard on the promised-by date input (`min` + warning, `isPastDate`
in `lib/date-guard.ts`); a "preview is with the parent" hint at `proof_ready` and a
password-reset hint on the studio sign-in; and the customer photo `alt` no longer leaks
the raw blob filename.
Video delivery (2026-06-17): the browser→Blob upload now passes `multipart: true`
(`lib/blob-upload-options.ts`) so 200–500 MB films upload as resilient parallel chunks
(the 2 GB token cap is unchanged). Each upload slot also gained a
`DeliveryLinkEditor` (`components/studio/delivery-link-editor.tsx`) for an external
https delivery link (Google Drive / Dropbox / …) — validated by `lib/delivery-url.ts`,
stored on `orders.proofUrl` / `orders.finalVideoUrl` via `setDeliveryUrl` →
`applyDeliveryUrlCore`. The status guardrail now accepts a link as an equal alternative
to an uploaded file (a link alone can mark proof_ready / delivered), and the customer
sees the in-app player and/or an "open the link" affordance (owned by `[[auth-gating]]`).
See `[[2026-06-17-studio-delivery-link]]`.
