---
type: zone
summary: "Two-layer /app gating: optimistic proxy cookie check + authoritative layout session check. Magic-link sign-in page. Owner-scoped order reads."
tags: [auth, security, customer-area]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[payload-backend]]", "[[upload-auto-advances-to-production]]"]
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
    - "app/(app)/app/layout.tsx"
    - "app/(app)/app/page.tsx"
    - "app/(app)/sign-in/page.tsx"
    - "components/app/status-timeline.tsx"
    - "components/app/photo-upload.tsx"
    - "components/app/proof-review.tsx"
    - "tests/auth/gating.test.ts"
    - "tests/app/order-stages.test.ts"
    - "tests/app/order-actions.test.ts"
depends: ["[[payload-backend]]"]
invariants:
  - rule: "proxy.ts is PRESENCE-ONLY (no DB hit). The authoritative DB check is app/(app)/app/layout.tsx only."
    enforcedBy: ["tests/auth/gating.test.ts"]
  - rule: "Customer order reads are ALWAYS owner-scoped via explicit where { owner: { equals: userId } } + overrideAccess:true. Never rely on Payload req.user."
    enforcedBy: ["tests/auth/gating.test.ts"]
  - rule: "Every mutating customer order action (lib/order-actions.ts) starts with assertOwnsOrder(orderId), which throws unless the signed-in customer owns the order. A customer can never mutate another customer's order."
    enforcedBy: ["tests/app/order-actions.test.ts"]
  - rule: "sign-in page is OUTSIDE the gated app route group — redirect can never trap it."
    enforcedBy: []
  - rule: "The status → stage mapping and parent-facing copy live ONLY in lib/order-stages.ts (DOM-free, tested). The timeline component and dashboard page render FROM it; they never re-derive stage indices or hardcode status copy."
    enforcedBy: ["tests/app/order-stages.test.ts"]
verifiedAt: bc2efd993f62b0522cd4bc08f2bf28267f6f6315
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
real customer actions: photo upload for `awaiting_assets` and proof review for
`proof_ready` (below). `delivered` still shows a labeled placeholder until the
video player lands (task 4.4).

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

## Lineage
Task 2.4 (proxy) + 2.5 (sign-in) + 2.6 (layout + customer data) + the dashboard
order list and animated production timeline (order-stages + status-timeline),
then Task 4.2 (photo upload) + 4.3 (proof review) wiring the two per-status
customer actions into the dashboard, all from the purchase → account →
dashboard plan.
