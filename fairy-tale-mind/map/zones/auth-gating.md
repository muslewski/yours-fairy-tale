---
type: zone
summary: "Two-layer /app gating: optimistic proxy cookie check + authoritative layout session check. Magic-link sign-in page. Owner-scoped order reads (list + single order). Per-order detail page with a customer→studio notes thread."
tags: [auth, security, customer-area]
status: active
created: 2026-06-03
updated: 2026-06-16
related: ["[[payload-backend]]", "[[upload-auto-advances-to-production]]", "[[video-ownership-route-over-static-url]]", "[[local-disk-video-delivery]]", "[[blob-pass-through-proxied-video]]", "[[prod-env-fail-closed]]", "[[studio]]", "[[delivery-promise-auto-from-length]]", "[[two-media-collections-public-and-gated]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-03-purchase-account-dashboard.md"
owns:
  # Routes live inside a (app) route group which the Mind generator's routeExists
  # can't resolve. Tracked via globs instead (same pattern as payload-backend).
  routes: []
  anchors: []
  globs:
    - "proxy.ts"
    - "lib/customer-data.ts"
    - "lib/order-stages.ts"
    - "lib/order-actions.ts"
    - "lib/order-notes-shared.ts"
    - "lib/order-options.ts"
    - "lib/order-upload-validation.ts"
    - "lib/video-access.ts"
    - "app/(site)/(app)/app/layout.tsx"
    - "app/(site)/(app)/app/page.tsx"
    - "app/(site)/(app)/app/orders/[id]/page.tsx"
    - "app/(site)/(app)/app/profile/page.tsx"
    - "app/(site)/(app)/api/orders/[id]/video/route.ts"
    - "app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts"
    - "app/(site)/(app)/sign-in/page.tsx"
    - "app/(site)/(app)/sign-in/verify/page.tsx"
    - "app/(site)/(app)/sign-in/verify/error/page.tsx"
    - "app/(site)/(app)/app/orders/[id]/loading.tsx"
    - "lib/safe-redirect.ts"
    - "tests/lib/safe-redirect.test.ts"
    - "lib/auth-confirm-url.ts"
    - "lib/order-tracking-link.ts"
    - "collections/auth/Users.ts"
    - "tests/auth/email-normalization.test.ts"
    - "tests/auth/order-tracking-link.test.ts"
    - "lib/auth.ts"
    - "lib/auth-emails.ts"
    - "tests/auth/auth-confirm-url.test.ts"
    - "components/app/status-timeline.tsx"
    - "components/app/delivery-countdown.tsx"
    - "components/app/mascot-image.tsx"
    - "components/app/photo-upload.tsx"
    - "components/app/prepare-upload.ts"
    - "components/app/proof-review.tsx"
    - "components/app/video-player.tsx"
    - "components/app/order-notes.tsx"
    - "components/app/uploaded-photos.tsx"
    - "components/app/sign-out-button.tsx"
    - "tests/auth/gating.test.ts"
    - "tests/auth/server.test.ts"
    - "tests/auth/order-detail-read.test.ts"
    - "tests/auth/add-order-note.test.ts"
    - "tests/app/order-stages.test.ts"
    - "tests/app/order-actions.test.ts"
    - "tests/app/video-access.test.ts"
    - "e2e/fixtures/auth.ts"
    - "e2e/fixtures/seed.runner.ts"
    - "e2e/fixtures/seed.vitest.config.ts"
depends: ["[[payload-backend]]"]
invariants:
  - rule: "proxy.ts is PRESENCE-ONLY (no DB hit). The authoritative DB check is app/(site)/(app)/app/layout.tsx only."
    enforcedBy: ["tests/auth/gating.test.ts"]
  - rule: "Customer order reads are ALWAYS owner-scoped via explicit where { owner: { equals: userId } } + overrideAccess:true. Never rely on Payload req.user. The single-order read (getOrderForOwner) adds the order id to the same where (and:[{id},{owner}]) so the /app/orders/[id] detail page can only load the signed-in customer's own order; a non-owned/unknown id reads as null → notFound()."
    enforcedBy: ["tests/auth/gating.test.ts", "tests/auth/order-detail-read.test.ts"]
  - rule: "Every mutating customer order action (lib/order-actions.ts) starts with assertOwnsOrder(orderId), which throws unless the signed-in customer owns the order. A customer can never mutate another customer's order. addOrderNote follows this too: it guards, then appends to customerNotes (validated, ≤ MAX_NOTE_LENGTH) and revalidates the detail path — it NEVER changes status and is available at any status. On a successful append it also sends a NON-FATAL studio heads-up email (notifyStudioOfNote → STUDIO_NOTIFY_EMAIL, fallback hello@yoursfairytale.com); a failed email is swallowed and never breaks the parent's note."
    enforcedBy: ["tests/app/order-actions.test.ts", "tests/auth/add-order-note.test.ts"]
  - rule: "The delivered film AND the proof preview are served ONLY through the ownership-checked route (app/(site)/(app)/api/orders/[id]/video, ?kind=proof for the preview) via resolveOwnedVideo(orderId, field) → assertOwnsOrder. Never a direct/guessable media URL; media stays read: adminOnly (a raw media.url 403s for parents). A non-owner can never fetch another customer's video."
    enforcedBy: ["tests/app/video-access.test.ts"]
  - rule: "Customer PHOTOS are served ONLY through the ownership-gated route app/(site)/(app)/api/orders/[id]/asset/[assetId] via resolveOwnedAsset(orderId, assetId) → the SAME assertOwnsOrder doorway as the video route. resolveOwnedAsset also checks the asset id is one of the order's `assets` and prefers the small `preview` size. Non-owner (or asset not on the order) → 403/404; media stays read: adminOnly, so this gate — not a guessable URL — is the only door. No Range (images need none)."
    enforcedBy: ["tests/app/video-access.test.ts"]
  - rule: "sign-in page is OUTSIDE the gated app route group — redirect can never trap it."
    enforcedBy: []
  - rule: "Magic-link emails point at the /sign-in/verify confirmation interstitial (via toConfirmSignInUrl), NEVER the raw /api/auth/magic-link/verify endpoint. The interstitial consumes nothing on GET; a human form submit reaches verify exactly once. This stops email scanners / link-preview bots from burning the single-use token (INVALID_TOKEN)."
    enforcedBy: ["e2e/fixtures/auth.ts", "tests/auth/auth-confirm-url.test.ts"]
  - rule: "User emails are stored LOWERCASE (Users.email beforeValidate hook + the webhook lowercases at resolution). Better Auth looks up users with email.toLowerCase() and Postgres equality is case-sensitive, so a mixed-case stored email would fail sign-in (new_user_signup_disabled). Storage and lookup MUST stay lowercase-aligned."
    enforcedBy: ["tests/auth/email-normalization.test.ts"]
  - rule: "The order-confirmation 'track your order' link (lib/order-tracking-link.ts) mints a verification in Better Auth's exact magic-link format (plain token identifier, value JSON {email}, expiresAt) and wraps it through toConfirmSignInUrl. It MUST stay consumable by BA's real verify endpoint."
    enforcedBy: ["tests/auth/order-tracking-link.test.ts"]
  - rule: "The status → stage mapping and parent-facing copy live ONLY in lib/order-stages.ts (DOM-free, tested). The timeline component and dashboard page render FROM it; they never re-derive stage indices or hardcode status copy."
    enforcedBy: ["tests/app/order-stages.test.ts"]
  - rule: "trustedOrigins NEVER contains a *.vercel.app wildcard (anyone can host there — it would hand CSRF/origin trust to arbitrary third parties). Previews are trusted only via this project's own VERCEL_URL / VERCEL_BRANCH_URL / VERCEL_PROJECT_PRODUCTION_URL; the load-bearing trust is the resolved base URL (BETTER_AUTH_URL, boot-required in prod)."
    enforcedBy: ["tests/auth/server.test.ts"]
  - rule: "A magic-link send failure RETHROWS from sendMagicLink so Better Auth surfaces an error and the sign-in page shows its gentle error state — never a false 'check your email' success."
    enforcedBy: ["lib/auth.ts"]
  - rule: "getOrdersForOwner reads with pagination:false + sort '-createdAt' — a customer sees ALL their orders newest-first, never Payload's silent 10-doc default page."
    enforcedBy: ["tests/auth/gating.test.ts"]
  - rule: "Each photo-upload server-action call carries ONE file, client-side re-encoded (≤2048px JPEG q0.85, EXIF orientation baked in) when over MAX_REQUEST_BYTES (3.5MB), so every request fits Vercel's ~4.5MB body cap; retries skip files already saved in a previous attempt."
    enforcedBy: ["components/app/prepare-upload.ts", "components/app/photo-upload.tsx"]
verifiedAt: 01f9d80
---

## Purpose
Implements the two-layer session gate described in the `better-auth-with-payload` skill and confirmed in the delieta reference.

### Layer 1 — Optimistic (proxy.ts)
`proxy.ts` at the repo root (Next 16's renamed Middleware) runs on every `/app/:path*` request. It calls `getSessionCookie(request)` from `better-auth/cookies` — presence only, no DB hit. If absent, redirect to `/sign-in?next=<path>`. If present, forward `x-pathname` header and continue. The decision is extracted into `shouldRedirectToSignIn(request): boolean`, a pure testable helper.

### Layer 2 — Authoritative (app/(site)/(app)/app/layout.tsx)
The layout calls `getCustomerSession()` → `auth.api.getSession({ headers })`. This validates the session token against the DB. Stale/expired cookies that slipped past layer 1 are caught here. On no session, `redirect("/sign-in?next=...")`.

### Customer data (lib/customer-data.ts)
- `getCustomerSession()` — wraps `auth.api.getSession({ headers: await headers() })`.
- `getOrdersForOwner(ownerId)` — Payload `find({ where: { owner: { equals: ownerId } }, overrideAccess: true })`. Testable without a session mock.
- `getOrdersForCurrentCustomer()` — composes the two above.
- `getOrderForOwner(ownerId, orderId)` — single-order read scoped by BOTH id and
  owner (`where: { and: [{ id }, { owner }] }`, `limit: 1`); returns the doc or
  `null` (unknown id / not theirs — never throws). The detail page's security
  boundary.
- `getOrderForCurrentCustomer(orderId)` — composes session + `getOrderForOwner`;
  `null` when unauthenticated.

### Dashboard view (app/(site)/(app)/app/page.tsx + the timeline)
The `/app` page lists the customer's orders as compact, comic-styled **link
cards** (`bg-white`, `border-2 border-brand-deep`, `shadow-comic`) — each a
`<Link href="/app/orders/{id}">` wrapped in `<li className="group">` that lifts
on hover via `group-hover:shadow-comic-lg` (shadow only on the stable ancestor —
no movement on the hover target, per the edge-jitter rule). A card shows the
child's name + chosen world, the production timeline, the status-message
**headline** only, and a "View details →" affordance. The per-status ACTIONS no
longer live here — they moved to the detail page (below), which is why the card
can be a single Link with no nested interactive controls. Empty state links to
the homepage configurator (`/#build`).

### Order detail page (app/(site)/(app)/app/orders/[id]/page.tsx)
The full home for one order. Server component: reads
`getOrderForCurrentCustomer(id)`, `notFound()` on null (owner-scoped — see the
read invariant). Renders the status timeline + the full status message (headline
+ body), the **DeliveryCountdown** card (`components/app/delivery-countdown.tsx`
+ `MascotImage` — days-granularity countdown to `promisedBy` from pure
`countdownState` in `lib/delivery.ts`: calm overdue variant, never negative
numbers, hidden once delivered and on refunded/cancelled — see
`[[delivery-promise-auto-from-length]]`), the relocated per-status ACTION slot
(photo upload / proof review / finished-film player — same components as
before), a read-only **"Your story"** panel (world, length, detail level, extra minutes, add-ons, the parent's original
`plotNote`; labels from `lib/order-options.ts`), and the **notes thread**
(`components/app/order-notes.tsx`). Lives under the `(app)` group so it inherits
the gate + chrome with no new gate code.

### Customer order actions (lib/order-actions.ts — `"use server"`)
Server-only mutations the dashboard calls. **Security invariant:** each begins
with `assertOwnsOrder(orderId)` — loads the order (Local API, `overrideAccess`)
and throws unless the signed-in customer owns it (`order.owner` id ===
`session.user.id`). Each revalidates BOTH `"/app"` and `"/app/orders/{id}"` so
the change shows immediately whether the action ran from the list or the detail
page.
- `uploadOrderAssets(orderId, formData)` — Task 4.2. Validates every file is an
  image ≤ 15 MB (rejects the whole batch with a clear message otherwise),
  creates one `media` doc per file, appends the ids to `order.assets`, and on
  the FIRST upload advances `awaiting_assets → in_production` (see
  `[[upload-auto-advances-to-production]]`).
- `approveProof(orderId)` — Task 4.3. Sets `status: approved`.
- `requestProofChange(orderId, note)` — Task 4.3. Sets `status: revisions` and
  saves the note to the Orders `revisionNote` textarea field.
- `addOrderNote(orderId, message)` — the parent's note to the studio from the
  detail page. Guards, validates (non-empty, ≤ `MAX_NOTE_LENGTH`), appends
  `{ message, createdAt }` to the Orders `customerNotes` array preserving prior
  rows, then `revalidatePath("/app/orders/{id}")`. Available at ANY status; does
  NOT change status. Returns a typed `AddNoteResult` (`{ ok } | { ok, error }`)
  the dialog surfaces. The studio reads the thread inline in `/admin`.

Two pure (non-`"use server"`) sidecars hold values that can't be exported from a
`"use server"` file (whose exports must all be async functions):
- **lib/order-upload-validation.ts** — `validateUploadFile`, `MAX_UPLOAD_BYTES`,
  shared by the action and the client upload component; unit-tested directly.
- **lib/order-notes-shared.ts** — `MAX_NOTE_LENGTH` (2000) + the `AddNoteResult`
  type, imported by both `order-actions.ts` and the `OrderNotes` dialog. (A
  re-export of these through the `"use server"` module breaks `next build` —
  Next 16 emits a runtime reference for the re-exported type. So the test + UI
  import them straight from the sidecar.)

### Action components (components/app/{photo-upload,proof-review}.tsx — `"use client"`)
- **PhotoUpload** — file input (`accept="image/*"`, multiple), client-side
  validation for instant feedback, `useTransition` pending state, error + done
  states. Calls `uploadOrderAssets`.
- **ProofReview** — renders the `proof` media (video/image by mime type, link
  fallback), an Approve button and a Request-a-change textarea panel. Calls
  `approveProof` / `requestProofChange`. The page passes the GATED route URL
  (`/api/orders/{id}/video?kind=proof`) — never the raw `media.url`, which is
  `read: adminOnly` and 403'd for parents before the 2026-06-10 fix.
Both guard Motion with `useReducedMotion()` and use brand tokens only.
- **VideoPlayer** (plain component, no `"use client"`) — the `delivered` action.
  A native `<video controls>` plus a Download link, both pointing at the
  ownership-gated route (below), with a calm "watch it together" line. When the
  order is `delivered` but `finalVideo` is not attached yet (`hasVideo` false),
  it renders a gentle "your video is being finalized" fallback instead of an
  empty player.
- **OrderNotes** (`components/app/order-notes.tsx`, `"use client"`) — the detail
  page's notes thread. Renders existing `customerNotes` as a chronological log
  (message + friendly date) and an "Add a note" Motion dialog (reduced-motion
  guarded; Escape / backdrop / successful send close it) whose textarea (capped
  at `MAX_NOTE_LENGTH`) submits via `addOrderNote`. No optimistic update — the
  new note appears after the server round-trip + `revalidatePath`.

### Delivered video — gated streaming (Task 4.4)
- **`lib/video-access.ts`** — `resolveOwnedVideo(orderId, field)` runs
  `assertOwnsOrder` (the shared ownership doorway), then resolves the media in
  `field` (`"finalVideo"` default, or `"proof"` for the preview) to the fields
  needed to stream it; returns `null` when there is no film yet (so the
  route 404s and the UI shows the fallback). `mediaFilePath(filename)` resolves
  the on-disk path under `MEDIA_STATIC_DIR` and guards against path traversal.
- **`app/(site)/(app)/api/orders/[id]/video/route.ts`** — the only path a customer can
  reach the film (and, via `?kind=proof`, the proof preview — same gate, same
  streaming plumbing). Non-owner → 403, no film → 404; `?download` sets an attachment
  disposition; `maxDuration = 300` for long downloads. Because `media` is
  `read: adminOnly`, access is gated by ownership, NOT by a guessable static URL
  (`[[video-ownership-route-over-static-url]]`). Two byte sources behind the same
  gate (`[[blob-pass-through-proxied-video]]`):
  - **Blob mode** (when `BLOB_READ_WRITE_TOKEN` is set, `isBlobStorageEnabled()`):
    resolves the stored file via `head(filename)` and PROXIES the bytes from
    Vercel Blob — the (public-but-unguessable) Blob URL never reaches the client.
    Forwards the client `Range` header so seeking works, relays upstream 416, and
    surfaces any other Blob non-200/206 as a 500 (so a Blob outage doesn't read
    as "every order is unfinalized"). Missing blob → 404.
  - **Local-disk fallback** (no token, dev only): streams from `MEDIA_STATIC_DIR`,
    Range-aware. Remaining future work — private Blob + signed playback URLs —
    stays tracked in `[[local-disk-video-delivery]]`.

### Uploaded photos — gated preview (2026-06-13)
The parent's own uploaded photos are shown back to them on the detail page, but
the bytes ride the SAME ownership gate as the film:
- **`resolveOwnedAsset(orderId, assetId)`** (`lib/video-access.ts`) runs
  `assertOwnsOrder`, then confirms `assetId` is one of the order's `assets`, then
  resolves the media doc (Local API, `overrideAccess`, `depth:0`) preferring its
  small `preview` size (falls back to the original). Returns `null` when the asset
  isn't on the order or has no file yet — never leaks another customer's photo.
- **`app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts`** — the only door
  to a customer photo. Mirrors the video route minus `Range` (images need none):
  Blob mode proxies the bytes via `head(filename)` (the Blob URL never reaches the
  client); local-disk fallback streams from `MEDIA_STATIC_DIR`. Non-owner → 403,
  unknown/foreign asset → 404. Because `media` is `read: adminOnly`, this gate —
  not a guessable URL — is the access boundary (see
  `[[two-media-collections-public-and-gated]]`).
- **`components/app/uploaded-photos.tsx`** ("Photos you sent") — a server-component
  thumbnail grid mounted on the detail page; each tile is a plain `<img>` pointing
  at `/api/orders/{id}/asset/{assetId}` (gated dynamic URLs aren't
  Next/Image-optimizable). Renders nothing when the order has no assets.

### Profile (app/(site)/(app)/app/profile/page.tsx + sign-out)
Server component; the layout has already gated the session, so it reads the
parent's name + email straight from it (read-only for MVP) into an on-brand card,
with a link back to `/app` and a **SignOutButton**.
- **`components/app/sign-out-button.tsx`** (`"use client"`) — calls
  `authClient.signOut()` then `router.replace("/sign-in")`, with a pending state.

- **`lib/order-stages.ts`** — DOM-free, fully unit-tested core. `STAGES` (the six
  ordered production steps), `stageForStatus(status)` → `{ activeIndex }` on the
  happy path or `{ terminal: "refunded" | "cancelled" }` off it, and
  `messageForStatus(status, childName?)` → brand-voice `{ headline, body }`.
  `proof_ready` and `revisions` both sit at stage 3 ("Your preview").
- **`components/app/status-timeline.tsx`** (`"use client"`) — renders the six
  stages as a comic stepper: completed (brand-yellow + check), active (brand-blue,
  gentle Motion pulse + filling rail), upcoming (muted). `useReducedMotion()`
  drops all auto-motion to static emphasis. Horizontal on desktop, vertical on
  mobile. For terminal statuses it renders a quiet note, not a stepper.

### Sign-in page (app/(site)/(app)/sign-in/page.tsx)
Client component. Email input + submit calling `authClient.signIn.magicLink({ email, callbackURL: "/app" })`. On success, "check your email" state. No-account explainer (with a "Place an order" → `/#build` CTA) below the form per brand-voice: calm, warm, explains checkout → email → account flow.
Design: a **split-screen** comic card (mirrors the configurator) — left brand-deep dotted "Welcome back" panel with the astronaut (hidden below lg), right panel holds the form + explainer. Gets the full site chrome via its own `app/(site)/(app)/sign-in/layout.tsx` (SiteNav + SiteFooter — see `[[app-shell]]`); the gated `/app` deliberately does not.

### E2E auth fixture (e2e/fixtures/auth.ts — Playwright `setup` project)
Produces the signed-in `storageState` (`e2e/.auth/customer.json`) the `chromium`
project consumes. The flow is version-proof — it never reads tokens from the DB
(BA may hash them):
1. **Seed first** (account must exist — `disableSignUp: true`): the fixture cannot
   `import` `seed.ts` directly, because pulling the Payload config (ESM-only,
   `@/`/`@payload-config` aliases) through Playwright's transpiler emits CJS that
   crashes at runtime (`exports is not defined in ES module scope`). Vitest's
   loader is the ONLY boot path proven on this stack, so the fixture shells out:
   `node --env-file=.env.test vitest run --config e2e/fixtures/seed.vitest.config.ts`.
   `seed.runner.ts` calls `seedCustomer(E2E_SEED_EMAIL)`; its scoped config aliases
   `@`/`@payload-config` and `include`s only that file, so it is never part of
   `npm test` (the name is not `*.test.ts`/`*.spec.ts`).
2. **Request the link through the real UI** (correct Origin for BA), assert the
   "Check your email" state.
3. **Capture via the test-mode sink** (see below): poll
   `e2e/.auth/last-magic-link.txt` for the verify URL.
4. **Visit it** → BA sets the session cookie → lands on `/app` → save storageState.

**Test-mode sink in `lib/auth.ts`:** `sendMagicLink` additionally writes the full
`url` to `e2e/.auth/last-magic-link.txt` ONLY when `process.env.PLAYWRIGHT_TEST === "1"`
(`.env.test` sets it). Strictly gated — production/dev behavior is unchanged; the
existing `console.log` always runs. `e2e/.auth/` is gitignored.

## Tests
`tests/auth/gating.test.ts` covers:
1. `shouldRedirectToSignIn`: no cookie → redirect; BA session cookie → pass; unrelated cookie → redirect.
2. `getOrdersForOwner`: creates two users + one order each, asserts only the queried user's order is returned (isolation by explicit where).

`tests/app/order-actions.test.ts` (DB-backed, network-free; mocks
`getCustomerSession` to inject the caller) covers:
1. `validateUploadFile`: accepts an image under the cap; rejects non-images and
   over-cap files with clear messages.
2. Ownership: `approveProof` / `requestProofChange` by a non-owner (and by an
   unauthenticated caller) reject and leave the order unmutated.
3. Owner happy path: `approveProof` → `approved`; `requestProofChange` →
   `revisions` + stored `revisionNote`.
The full multipart upload round-trip is not exercised (awkward to feed a real
File through the action in the node env); the validation predicate and the
shared ownership guard — the security-critical paths — are.

`tests/app/video-access.test.ts` (DB-backed, network-free; same session mock)
covers `resolveOwnedVideo`: the owner of a `delivered` order with a `finalVideo`
gets the media back; a non-owner and an unauthenticated caller are rejected
(learning nothing about the file); a `delivered` order with no `finalVideo`
resolves to `null` for the owner. The route handler's streaming/Range/disposition
plumbing is thin glue over this gate and is not separately unit-tested.

> Build/runtime caveat: a `@better-auth/kysely-adapter` ↔ `kysely` export
> mismatch historically broke `npm run build` and server-side auth handlers in
> dev. As of 2026-06-10 the deciding evidence is CI's Playwright webServer build
> (a local build attempt was OOM-killed in the sandbox before any kysely error
> appeared). Tracked in `[[better-auth-kysely-build-break]]` — close that note
> once a green CI build on this branch is observed.

## Lineage
Task 2.4 (proxy) + 2.5 (sign-in) + 2.6 (layout + customer data) + the dashboard
order list and animated production timeline (order-stages + status-timeline),
then Task 4.2 (photo upload) + 4.3 (proof review) wiring the two per-status
customer actions into the dashboard, then Task 4.4 (the ownership-gated delivered
video player + streaming route) + 4.5 (the profile page + sign-out), all from the
purchase → account → dashboard plan.
The dashboard's `WORLD_LABELS` was extracted to the shared `lib/worlds.ts` (also used by
the configurator's plot picker) when checkout was wired to real Stripe (2026-06-03).
The magic-link sign-in email now actually sends (branded, via Resend) instead of only
console-logging the link; the dev `console.log` + Playwright file-sink are retained
(2026-06-04, see `[[branded-email-template]]`).
Magic-link emails now point at a `/sign-in/verify` confirmation interstitial instead of
the raw verify endpoint, so email scanners that pre-fetch the link can't burn the
single-use token (was failing with INVALID_TOKEN in prod) (2026-06-04, see
`[[magic-link-confirmation-interstitial]]`).
Each order got its own owner-scoped detail page at `/app/orders/[id]`: the dashboard
list became compact link cards (per-status actions relocated to the detail page), and
the detail page added a read-only "Your story" panel + a customer→studio notes thread
(append-only `customerNotes` on the order, shown back to the parent, visible to the
studio in `/admin`) (2026-06-04, see `[[order-detail-subpage-and-notes]]`).
Launch hardening (2026-06-10): the `*.vercel.app` trustedOrigins wildcard was removed
(explicit domains + this project's VERCEL_* deploy URLs; BETTER_AUTH_URL is the
load-bearing trust and is now boot-required); magic-link send failures rethrow so the
sign-in page shows a real error; `getOrdersForOwner` lost the silent 10-doc cap
(pagination:false, newest-first); the delivered-video route gained the Blob proxy mode
(see `[[blob-pass-through-proxied-video]]`); and photo uploads re-encode client-side
(`components/app/prepare-upload.ts`) and ship one file per server-action call to fit
Vercel's body cap, with retries skipping already-saved files. Note: browsers that
cannot decode HEIC (non-Safari) reject >3.5MB HEICs with a gentle error instead of
converting — see the `heic-photos-over-cap-rejected` tech-debt note.
Studio panel (2026-06-10): the order detail page gained the **DeliveryCountdown**
card (mascot + days-to-`promisedBy`, see `[[delivery-promise-auto-from-length]]`),
and proof playback was FIXED to stream through the ownership-gated video route
(`?kind=proof`, `resolveOwnedVideo` gained a field param) — the page used to pass
the raw `media.url`, which is `read: adminOnly` and 403'd for parents.
Two media collections + gated photo preview (2026-06-13): customer PHOTOS now
also proxy through an ownership-gated route
(`app/(site)/(app)/api/orders/[id]/asset/[assetId]`, `resolveOwnedAsset`, same
`assertOwnsOrder` doorway, non-owner 403), and the detail page gained a "Photos
you sent" gallery (`components/app/uploaded-photos.tsx`) that loads the small
`preview` size through that gate (see `[[two-media-collections-public-and-gated]]`).
Post-purchase UX (2026-06-16, Phase 4): sign-in now honors `?next=` deep links via a
shared open-redirect guard (`lib/safe-redirect.ts`, also used by the verify page);
a branded expired/used magic-link page (`sign-in/verify/error`) is wired through Better
Auth's `errorCallbackURL`; `requestProofChange` also appends the parent's request to
`customerNotes` (a receipt in their thread); the preview stays watchable read-only during
`revisions` (`ProofReview readOnly`, `loadProof` guard widened to `proof_ready || revisions`);
and the order-detail loading skeleton gained Photos + Notes blocks.
