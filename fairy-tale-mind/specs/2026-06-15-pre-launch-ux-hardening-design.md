---
type: spec
summary: "Pre-launch UX hardening: a phased program fixing ~30 customer- and admin-facing experience gaps found in a journey audit before real payments — trust/legal blockers, the post-success confirmation, configurator form-persistence, a photos-before-checkout flow, post-purchase email/auth fixes, and studio/global polish."
tags: [ux, launch, checkout, configurator, auth, studio, legal, brand-voice]
status: planned
created: 2026-06-15
updated: 2026-06-15
related: ["[[homepage]]", "[[configurator]]", "[[checkout]]", "[[auth-gating]]", "[[studio]]", "[[app-shell]]", "[[payload-backend]]"]
sources: []
origin: "brainstorming 2026-06-15 (journey audit, 3 parallel reviewers + tech-debt triage)"
---

# Pre-launch UX hardening

**Date:** 2026-06-15

## Why

Before taking **real payments**, a three-reviewer audit of the full customer journey (acquisition →
configure → checkout → post-purchase → studio) plus a triage of tracked tech-debt surfaced ~30
experience gaps. The money-critical paths (pricing integrity, ownership gating, auth gating, video
delivery) are sound; the gaps are **trust/legal items and experience rough edges**. This spec
collects the fixes into a **phased program** (one spec, sequenced phases) so each phase ships
working, testable software and the whole journey is launch-ready.

Scope chosen by the user: **comprehensive** (all three severity tiers).

## Decisions (from brainstorming)

- **Social proof:** the hero's "40,000+ children already starring" is replaced with a **soft, true
  line** (no invented numbers) — e.g. a calm badge like "Now taking our first orders" and an honest
  hero subline. Brand-voice skill applies.
- **"Watch a sample":** a real sample video is **coming soon** (user provides later). The CTAs
  scroll to a **new sample section placed first, directly below the hero**, which shows a calm
  "coming soon" placeholder until the video lands, then plays it inline.
- **Photos before checkout:** **move photo collection into the configurator** so checkout is the
  final step (its own phase — see Phase 3). Association via **pathnames in Stripe metadata**, with
  uploads **capped at 6 photos** to bound metadata size + abandoned-blob exposure.
- **Comprehensive scope**, written as Phases 1–5; reviewed before the implementation plan.

## Inputs

- **Business identity (provided):** Firma Dominik Jaworski AI · NIP 5543048002 · REGON 544985902 ·
  ul. Nad Stawem 4, 86-005 Białe Błota · jurisdiction Poland. — Phase 1.
- **Sample video:** coming soon (user provides later). Phase 2 ships the sample **section** with a
  calm "coming soon" placeholder now; the video drops in via a single source constant — not a
  blocker. — Phase 2.
- **Legal review (still needed):** this spec fills the entity identifiers only; the legal wording
  gets the user's / a lawyer's review before launch. — Phase 1.

## Non-goals

- Internal-only tech-debt (dual-lockfiles, importmap-drift, mind-verifier, test-fixture dupes,
  stale dev-DB enum rows) — out of scope here; stays in `tech-debt/`.
- Private signed video URLs (`local-disk-video-delivery`) — deferred post-launch (current
  unguessable-Blob-behind-ownership-gate is acceptable for MVP).
- Re-architecting auth or the order model beyond the named items.

---

## Phase 1 — Trust & launch-blockers

Must land before real money.

1. **Legal entity details.** `app/(site)/(legal)/terms/page.tsx`, `privacy/page.tsx`,
   `refund/page.tsx`: replace `[registered business name and address]` → "Firma Dominik Jaworski AI,
   NIP 5543048002, REGON 544985902, ul. Nad Stawem 4, 86-005 Białe Błota"; `[your governing
   jurisdiction]` → "Poland (Polish law)". Flag for user/legal review. Closes
   `legal-pages-need-entity-and-review`.
2. **Replace fabricated social proof.** `components/home/hero.tsx`: remove the "40,000+ children"
   count + avatar circles; replace the badge/subline with an honest, warm line (brand-voice).
3. **Notify the studio of customer notes.** `lib/order-actions.ts` `addOrderNote` (or
   `appendCustomerNote`): after a parent posts a note, send a **non-fatal internal email** to the
   studio via `lib/email.ts` (reuse `renderBrandedEmail`/a plain internal template) so time-sensitive
   notes aren't missed. Closes `studio-not-notified-of-customer-notes`.
4. **Verify fail-closed boot on Vercel.** Confirm an `instrumentation.ts` `register()` throw
   actually 500s the deploy (one preview/staging smoke test). Confirm `BETTER_AUTH_URL` is set in
   prod (it is, per the env audit) and the production build is green. Closes
   `verify-fail-closed-boot-on-vercel` / `better-auth-url-unset` / `better-auth-kysely-build-break`
   verification.

## Phase 2 — Acquisition & checkout UX

1. **Post-success confirmation page** (already designed). New public `app/(site)/order-confirmed/page.tsx`
   (outside the `/app` gate); `lib/checkout.ts` `success_url` → `/order-confirmed?session={CHECKOUT_SESSION_ID}`.
   Copy: heading "Your order is confirmed"; body "We've emailed you a confirmation with a link to
   track your video's progress — it can take a minute or two to arrive."; **spam note** "Don't see
   it? Check your spam or promotions folder."; CTA "Sign in to track your order" → `/sign-in`
   (+ "Go to your orders" → `/app` when already signed in). No DB/auth dependency (robust to the
   async webhook). The page **clears the configurator draft** (Phase 3) on mount.
2. **Mobile navigation.** `components/home/site-nav.tsx`: the nav is `hidden md:flex` with no mobile
   menu. Add a hamburger + slide-out drawer (Motion, reduced-motion guarded) exposing Home / Fairy
   Tale / Series / Journal / Contact / Sign in / Start.
3. **Sample section + CTAs.** Add a new `#sample` **section placed directly below the hero** (the
   first homepage section) — for now a calm "Sample coming soon" placeholder card; the user-provided
   video drops in later via a single source constant (easy swap). `components/home/hero.tsx` +
   `cta-banner.tsx` "Watch a sample" CTAs scroll to `#sample` (standardize the copy). Update the
   homepage section order + the `<SectionWave>` dividers around the new section.
4. **Footer newsletter form.** `components/home/site-footer.tsx`: the email form has no handler
   (native GET reload, signups lost). Wire to the existing waitlist/Resend path with a submission
   state + confirmation, or remove until ready.
5. **Footer dead content links + nav copy.** Footer "Track your order / Our story / Reviews /
   Careers" → `/#top` and "Gift cards" → `/#build`: point at real destinations or render as
   non-interactive text. Nav primary CTA "Start! ⚡" → "Start" (no exclamation/emoji, brand-voice).
   Closes the remainder of `footer-dead-links`.
6. **Wrap the Stripe call.** `app/api/stripe/checkout/route.ts:66`: `stripe.checkout.sessions.create`
   is unwrapped — wrap in try/catch, log the Stripe error, return `NextResponse.json({error}, {status:502})`.

## Phase 3 — Photos-before-checkout flow (most architecturally involved)

**Goal:** collect the child's photos in the configurator **before** checkout, so checkout is the
final step and the order is created already carrying its photos.

**The association problem:** at configure time there is no account/order yet (the webhook creates
both after payment). So pre-checkout photos must be linked to the order the webhook later creates.

**Recommended approach (MVP — pathnames in checkout metadata):**
- Configurator Step 3 (`StepPhotos`/`photo-dropzone`) uploads photos to **Vercel Blob via the
  plugin's `clientUploads`** (browser → Blob directly, bypassing Vercel's ~4.5MB request cap),
  yielding blob **pathnames**. Validate type/size client-side; **cap at 6 photos** (enforced client
  AND server) so the joined pathnames fit a Stripe metadata value (≤500 chars) and abandoned-upload
  exposure stays bounded.
- `startCheckout` passes the pathnames to `/api/stripe/checkout`; `buildCheckoutSessionParams` adds
  `metadata.assetPaths = pathnames.join(",")` (server validates count/length).
- The webhook (`checkout.session.completed`) reads `assetPaths`, creates `media` docs **metadata-only**
  (filename = pathname, like `attachVideoCore`), attaches them to `order.assets`, and sets the order
  straight to **`in_production`** (photos present → no `awaiting_assets` wait). This fixes the
  contradictory `paid`-status copy and the "no upload action" gap by removing that limbo entirely.
- The post-checkout dashboard upload **remains** for adding/replacing photos later.
- **Abandoned-upload cleanup:** photos uploaded but never checked out leave orphaned blobs — add a
  TTL/cron prune (and fold in the existing `orphaned-blobs-no-cleanup` debt). Document the cap +
  cleanup as the known trade-offs.

**Resolved:** pathnames-in-Stripe-metadata with a **6-photo cap** (chosen over a `pendingUploads`
token+collection for simplicity; the cap also bounds abandoned-blob exposure).

## Phase 4 — Post-purchase UX

1. **Magic-link error page.** `app/(site)/(app)/sign-in/verify/page.tsx`: pass
   `errorCallbackURL=/sign-in/verify/error`; new branded page "This link has expired or was already
   used — request a new one" + resend. Also surface `?error=` on the sign-in page gently.
2. **Sign-in honors `?next=`.** `sign-in/page.tsx`: read `useSearchParams().next` and pass it as the
   magic-link `callbackURL` (currently hardcoded `/app`) so deep-linked parents land on the intended
   order, not the list. `proxy.ts` already sets `?next=`.
3. **One-click status emails.** `lib/order-status-email.ts` / the `statusTransitionEmailHook`
   (`collections/Orders.ts`): for `proof_ready`/`delivered`, mint a `createOrderTrackingLink` with
   `callbackURL=/app/orders/${doc.id}` instead of linking to bare `/sign-in`.
4. **Revision note → customer thread.** `lib/order-action-cores.ts` `requestProofChangeCore` (or the
   action): also `appendCustomerNote(orderId, note)` so the parent sees a receipt of what they asked
   to change (currently saved only to the staff-only `revisionNote`).
5. **Proof viewable during `revisions`.** `app/(site)/(app)/app/orders/[id]/page.tsx`: extend the
   `loadProof` guard to `proof_ready || revisions` so the parent can re-watch the preview while
   waiting.
6. **Order-detail loading skeleton.** `app/(site)/(app)/app/orders/[id]/loading.tsx`: add skeleton
   blocks for the "Photos you sent" + "Notes" sections to stop the layout shift.

## Phase 5 — Studio & global polish

1. **Confirm-guard destructive transitions.** `components/studio/workflow-card.tsx`: a confirm step
   before moving an order to `cancelled`/`refunded`.
2. **In-flight feedback.** `workflow-card.tsx` / `promised-by-editor.tsx`: button label → "Saving…"
   + `aria-busy` during the action (currently only `disabled`, no signal).
3. **Studio hints.** `proof_ready` card: "The preview is with the parent — they'll approve or request
   changes." `studio/sign-in/page.tsx`: "Reset your password in the Payload admin at /admin."
4. **Past-date delivery guard.** `promised-by-editor.tsx`: `min={today}` + warn on a past date.
5. **Photo `alt`.** `studio/(gated)/orders/[id]/page.tsx:217`: `alt="customer photo"` (not the raw
   blob filename).
6. **Notes-modal focus trap.** `components/app/order-notes.tsx`: trap focus within the dialog
   (native `<dialog>` or a focus-scope) + `aria-labelledby`.
7. **Focus-ring gaps.** `app/(site)/error.tsx`, `not-found.tsx`, `components/home/faq.tsx`
   (`<summary>`), `studio/sign-in` inputs: add `focus-visible:ring-*` so keyboard users see focus.

---

## Testing strategy

- **Layer A Playwright** (deterministic, no DB): `/order-confirmed` content; configurator
  form-persistence across a `/#build` re-entry; mobile-nav drawer open/close; magic-link error page;
  sign-in `?next=` carry-through (mock the auth call).
- **Unit (vitest):** configurator-draft save/load/clear; `buildCheckoutSessionParams` includes
  `success_url=/order-confirmed` + `assetPaths` metadata; `requestProofChangeCore` also appends a
  customer note; the studio-notify email fires on `addOrderNote` (non-fatal).
- **Layer B / harness:** the **agent order-tooling MCP** drives the new flows on the test branch —
  create_order with `assetPaths`, verify `order.assets` + `in_production`; proof-during-revisions
  visibility; one-click status-email link mint. (This is the harness paying off.)
- **Manual/staging:** photos-before-checkout end-to-end on the staging env (real Blob clientUploads).

## Mind impact

Re-stamp `homepage`, `configurator`, `checkout`, `auth-gating`, `studio`, `app-shell` zones; new
decision records for the photos-before-checkout association mechanism + the public success page;
update/close the relevant `tech-debt/` notes (footer-dead-links, social-proof, studio-notify,
legal-pages, orphaned-blobs as it gets a cleanup). `npm run mind`.

## Risks / open considerations

- **Photos-before-checkout** is the riskiest phase: anonymous pre-checkout uploads need client+server
  validation, the **6-photo cap**, and abandoned-blob cleanup. Association mechanism resolved
  (pathnames-in-metadata + cap).
- **Legal copy** needs human/legal review — this spec fills identifiers only (now incl. the full address).
- **Sample video** arrives later — Phase 2 ships the "coming soon" sample section now and swaps the
  video in via one source constant; not a blocker.
- Several Phase-5 items are small but touch many files; keep each as an isolated, separately-testable change.
