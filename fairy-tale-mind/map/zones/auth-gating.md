---
type: zone
summary: "Two-layer /app gating: optimistic proxy cookie check + authoritative layout session check. Magic-link sign-in page. Owner-scoped order reads."
tags: [auth, security, customer-area]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[payload-backend]]", "[[upload-auto-advances-to-production]]", "[[video-ownership-route-over-static-url]]", "[[local-disk-video-delivery]]"]
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
    - "lib/order-upload-validation.ts"
    - "lib/video-access.ts"
    - "app/(app)/app/layout.tsx"
    - "app/(app)/app/page.tsx"
    - "app/(app)/app/profile/page.tsx"
    - "app/(app)/api/orders/[id]/video/route.ts"
    - "app/(app)/sign-in/page.tsx"
    - "components/app/status-timeline.tsx"
    - "components/app/photo-upload.tsx"
    - "components/app/proof-review.tsx"
    - "components/app/video-player.tsx"
    - "components/app/sign-out-button.tsx"
    - "tests/auth/gating.test.ts"
    - "tests/app/order-stages.test.ts"
    - "tests/app/order-actions.test.ts"
    - "tests/app/video-access.test.ts"
    - "e2e/fixtures/auth.ts"
    - "e2e/fixtures/seed.runner.ts"
    - "e2e/fixtures/seed.vitest.config.ts"
depends: ["[[payload-backend]]"]
invariants:
  - rule: "proxy.ts is PRESENCE-ONLY (no DB hit). The authoritative DB check is app/(app)/app/layout.tsx only."
    enforcedBy: ["tests/auth/gating.test.ts"]
  - rule: "Customer order reads are ALWAYS owner-scoped via explicit where { owner: { equals: userId } } + overrideAccess:true. Never rely on Payload req.user."
    enforcedBy: ["tests/auth/gating.test.ts"]
  - rule: "Every mutating customer order action (lib/order-actions.ts) starts with assertOwnsOrder(orderId), which throws unless the signed-in customer owns the order. A customer can never mutate another customer's order."
    enforcedBy: ["tests/app/order-actions.test.ts"]
  - rule: "The delivered film is served ONLY through the ownership-checked route (app/(app)/api/orders/[id]/video) via resolveOwnedVideo → assertOwnsOrder. Never a direct/guessable media URL; media stays read: adminOnly. A non-owner can never fetch another customer's video."
    enforcedBy: ["tests/app/video-access.test.ts"]
  - rule: "sign-in page is OUTSIDE the gated app route group — redirect can never trap it."
    enforcedBy: []
  - rule: "The status → stage mapping and parent-facing copy live ONLY in lib/order-stages.ts (DOM-free, tested). The timeline component and dashboard page render FROM it; they never re-derive stage indices or hardcode status copy."
    enforcedBy: ["tests/app/order-stages.test.ts"]
verifiedAt: 7ca00807e2f3dfdf0054bade949edfffc7e91524
---

## Purpose
Implements the two-layer session gate described in the `better-auth-with-payload` skill and confirmed in the delieta reference.

### Layer 1 — Optimistic (proxy.ts)
`proxy.ts` at the repo root (Next 16's renamed Middleware) runs on every `/app/:path*` request. It calls `getSessionCookie(request)` from `better-auth/cookies` — presence only, no DB hit. If absent, redirect to `/sign-in?next=<path>`. If present, forward `x-pathname` header and continue. The decision is extracted into `shouldRedirectToSignIn(request): boolean`, a pure testable helper.

### Layer 2 — Authoritative (app/(app)/app/layout.tsx)
The layout calls `getCustomerSession()` → `auth.api.getSession({ headers })`. This validates the session token against the DB. Stale/expired cookies that slipped past layer 1 are caught here. On no session, `redirect("/sign-in?next=...")`.

### Customer data (lib/customer-data.ts)
- `getCustomerSession()` — wraps `auth.api.getSession({ headers: await headers() })`.
- `getOrdersForOwner(ownerId)` — Payload `find({ where: { owner: { equals: ownerId } }, overrideAccess: true })`. Testable without a session mock.
- `getOrdersForCurrentCustomer()` — composes the two above.

### Dashboard view (app/(app)/app/page.tsx + the timeline)
The `/app` page lists the customer's orders as comic-styled cards (`bg-white`,
`border-2 border-brand-deep`, `shadow-comic`): child's name + chosen world, the
production timeline, and a calm status-aware message. Empty state links to the
homepage configurator (`/#build`). The per-status ACTION slot now renders the
real customer actions: photo upload for `awaiting_assets`, proof review for
`proof_ready`, and the finished-film player for `delivered` (below). The header
carries a **Profile** link to `/app/profile`.

### Customer order actions (lib/order-actions.ts — `"use server"`)
Server-only mutations the dashboard calls. **Security invariant:** each begins
with `assertOwnsOrder(orderId)` — loads the order (Local API, `overrideAccess`)
and throws unless the signed-in customer owns it (`order.owner` id ===
`session.user.id`). All three end with `revalidatePath("/app")`.
- `uploadOrderAssets(orderId, formData)` — Task 4.2. Validates every file is an
  image ≤ 15 MB (rejects the whole batch with a clear message otherwise),
  creates one `media` doc per file, appends the ids to `order.assets`, and on
  the FIRST upload advances `awaiting_assets → in_production` (see
  `[[upload-auto-advances-to-production]]`).
- `approveProof(orderId)` — Task 4.3. Sets `status: approved`.
- `requestProofChange(orderId, note)` — Task 4.3. Sets `status: revisions` and
  saves the note to the new Orders `revisionNote` textarea field.

The pure file-validation predicate (`validateUploadFile`, `MAX_UPLOAD_BYTES`)
lives in **lib/order-upload-validation.ts** — kept out of the `"use server"`
file (whose exports must all be async) so it is shared by both the action and
the client upload component, and unit-tested directly.

### Action components (components/app/{photo-upload,proof-review}.tsx — `"use client"`)
- **PhotoUpload** — file input (`accept="image/*"`, multiple), client-side
  validation for instant feedback, `useTransition` pending state, error + done
  states. Calls `uploadOrderAssets`.
- **ProofReview** — renders the `proof` media (video/image by mime type, link
  fallback), an Approve button and a Request-a-change textarea panel. Calls
  `approveProof` / `requestProofChange`. The page resolves the `proof` media id
  to `{ url, mimeType, alt }` server-side and passes it in.
Both guard Motion with `useReducedMotion()` and use brand tokens only.
- **VideoPlayer** (plain component, no `"use client"`) — the `delivered` action.
  A native `<video controls>` plus a Download link, both pointing at the
  ownership-gated route (below), with a calm "watch it together" line. When the
  order is `delivered` but `finalVideo` is not attached yet (`hasVideo` false),
  it renders a gentle "your video is being finalized" fallback instead of an
  empty player.

### Delivered video — gated streaming (Task 4.4)
- **`lib/video-access.ts`** — `resolveOwnedVideo(orderId)` runs `assertOwnsOrder`
  (the shared ownership doorway), then resolves `order.finalVideo` to the media
  fields needed to stream it; returns `null` when there is no film yet (so the
  route 404s and the UI shows the fallback). `mediaFilePath(filename)` resolves
  the on-disk path under `MEDIA_STATIC_DIR` and guards against path traversal.
- **`app/(app)/api/orders/[id]/video/route.ts`** — the only path a customer can
  reach the film. `GET` streams the local file (Range-aware for scrubbing);
  `?download` sets an attachment disposition. Non-owner → 403, no film → 404.
  Because `media` is `read: adminOnly`, access is gated by ownership, NOT by a
  guessable static URL (`[[video-ownership-route-over-static-url]]`). The
  local-disk byte source is a deliberate MVP shortcut, flagged in-code and in
  `[[local-disk-video-delivery]]` — production needs signed/managed delivery.

### Profile (app/(app)/app/profile/page.tsx + sign-out)
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

### Sign-in page (app/(app)/sign-in/page.tsx)
Client component. Email input + submit calling `authClient.signIn.magicLink({ email, callbackURL: "/app" })`. On success, "check your email" state. No-account explainer below the form per brand-voice: calm, warm, explains checkout → email → account flow.

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

> Build/runtime caveat: `npm run build` and any server-side auth route handler in
> `next dev` currently fail with a `@better-auth/kysely-adapter` ↔ `kysely`
> export mismatch. This is **pre-existing and repo-wide** (it breaks the
> untouched `app/api/auth/[...all]/route.ts`), not caused by this work, so the
> video route could not be smoke-tested end to end. Tracked in
> `[[better-auth-kysely-build-break]]`. tsc is clean and the unit suite is green.

## Lineage
Task 2.4 (proxy) + 2.5 (sign-in) + 2.6 (layout + customer data) + the dashboard
order list and animated production timeline (order-stages + status-timeline),
then Task 4.2 (photo upload) + 4.3 (proof review) wiring the two per-status
customer actions into the dashboard, then Task 4.4 (the ownership-gated delivered
video player + streaming route) + 4.5 (the profile page + sign-out), all from the
purchase → account → dashboard plan.
The dashboard's `WORLD_LABELS` was extracted to the shared `lib/worlds.ts` (also used by
the configurator's plot picker) when checkout was wired to real Stripe (2026-06-03).
