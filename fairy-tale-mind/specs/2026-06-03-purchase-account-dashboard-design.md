---
type: spec
summary: "Turn the simulated checkout into a real purchase → account → dashboard app: Stripe Checkout + PayloadCMS (admin/data + native auth for staff) + Better Auth (customer accounts), with NO public sign-up (accounts are created by the checkout webhook) and a status-driven 'building your video' dashboard for the days-to-weeks studio production wait."
tags: [checkout, configurator, auth, payload]
status: planned
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]", "[[checkout-is-a-simulation]]", "[[payments-stripe-over-shopify]]", "[[product]]", "[[series]]"]
sources: ["[[payments-stripe-over-shopify]]", "[[product]]"]
origin: "Brainstorm: once Stripe Checkout was chosen, decide between a plain 'form + pay' flow and a real account/dashboard product. Chosen: full customer accounts + a status dashboard, because the product is a hand-animated video with a days-to-weeks studio production wait. Auth pattern is grounded in the delieta reference app (identical stack)."
---

# Purchase → Account → Dashboard app — design

## Goal
Replace the simulated checkout ([[checkout-is-a-simulation]]) with a real, end-to-end
product experience: a parent configures a personalized video, **pays via Stripe
Checkout**, has an **account auto-created by the checkout webhook** (no public sign-up),
and lands in an **`/app` dashboard** that shows a status-driven "building your video"
experience through the **days-to-weeks human-studio production wait**, ending in
watching/downloading the finished HD video.

## Decisions locked
- **Payments:** Stripe Checkout (hosted), per [[payments-stripe-over-shopify]]. Merchant
  onboards as a Polish **Individual** (PESEL, no company). Buyers are in the **US**.
- **Product reality:** a personalized **hand-animated video** ([[product]]); fulfillment
  is **human studio, days–weeks**; workflow is **light touch** — buyer submits up front,
  is mostly hands-off, with an **optional proof/approve** step.
- **Customer surface:** **Full accounts + `/app` dashboard** (not a tokenized guest link).
- **Two auth systems, by design:** **Better Auth** for *customers*; **Payload native auth**
  for *staff/developers* (the `/admin` panel). See Auth architecture below.
- **No public sign-up.** Accounts exist only as a side effect of a paid checkout; the
  frontend exposes **sign-in only**. Buy first, sign in after with the checkout email.

## Stack
- **Frontend:** existing **Next.js 16.2.6** app (marketing + configurator + `/app`).
- **Data + admin:** **Payload v3** mounted in the same Next app (`/admin`). Compatible with
  Next 16.2+ (verified; delieta runs this exact combo). Where *we* run production.
- **Customer auth:** **Better Auth**, bridged to Payload via a **custom adapter** built on
  BA's official `createAdapterFactory` (NOT the `payload-auth` plugin — see Auth
  architecture). Magic-link sign-in.
- **Staff auth:** **Payload native auth** on a single `admins` collection.
- **Database:** **Neon Postgres** (Vercel Marketplace), `idType: 'uuid'`. *(MongoDB Atlas
  is the fallback if a document store is later preferred.)*
- **Photo storage:** Payload upload → **private Vercel Blob / S3** (child PII, access-
  controlled; never in git).
- **Final video:** a dedicated video host (**Mux** or **Cloudflare Stream**) with
  **signed, expiring playback URLs** — streaming + access control beats raw file download.
- **Email:** **Resend** (or equivalent) for magic links + status-change notifications.

## Auth architecture — two separate systems
Pattern adopted from the **delieta** app (our *exact* stack: Next 16.2.6 · Payload 3.85 ·
better-auth 1.6.11). The canonical implementation is captured in the
**`better-auth-with-payload`** skill; this section is the product-level summary.

- **Staff / developers → Payload native auth.** One **`admins`** collection with
  `auth: true`, set as `admin.user` in `payload.config.ts`. It is the *only* auth-enabled
  collection. It gates `/admin`. Cookie: `payload-token`.
- **Customers → Better Auth.** The **`users`** collection is a *plain* Payload collection
  (**no `auth: true`** — BA owns credentials, which live on `accounts`). BA runs the
  customer login UX (magic link). Cookie: `better-auth.session_token`. BA's HTTP handler
  mounts at **`/api/auth/[...all]`**, *outside* the Payload route group, so the two never
  collide.
- **Bridge = a custom adapter, NOT `payload-auth`.** Use BA's official
  `createAdapterFactory` to route every BA DB op through Payload's **Local API** (delieta's
  `better-auth-payload-adapter.ts`, ~270 lines). Payload owns the schema; the
  `users / accounts / sessions / verifications` collections mirror BA's camelCase field
  names 1:1. Config that makes it work: `depth: 0`, `disableIdGeneration: true`, UUID ids,
  `transaction: false`. **Avoid `@payload-auth/better-auth-db-adapter`** — deprecated,
  pins old versions, and its **sign-IN path silently fails** on this stack (delieta's
  documented failure).
- **Session validation (two layers):** an optimistic cookie-presence check in `proxy.ts`
  (Next 16 Proxy) over `/app/*` → redirect to `/sign-in` if absent; the authoritative
  `auth.api.getSession({ headers })` in the `/app` layout / server components.
- **Access control (conscious choice — both reference apps flagged this as THE fork):** the
  BA session is **not** auto-surfaced to Payload `req.user`. For MVP, lock the Payload API
  for customer collections (admin-only) and fetch customer data in server components/actions
  **filtered by the BA user id** (`Orders.owner === baUser.id`), à la delieta's
  `dashboard-data.ts` (explicit `where` + `overrideAccess`). **Do not ship dormant access
  rules that *look* like they enforce but don't** (delieta's live bug). Build a real
  BA→`req.user` bridge later only if we want row-level Payload enforcement.

## Account creation — checkout-gated, NO public sign-up
Our deliberate divergence from both reference apps (which allow open self-serve sign-up).
An account exists **only** as a side effect of a paid Stripe Checkout.

- **No sign-up route or form.** The frontend exposes **sign-in only**.
- **The Stripe webhook creates the account.** On `checkout.session.completed`, server-side
  (via the adapter / Payload Local API) we **upsert the `users` row keyed by the Stripe
  email** and create the `Order` owned by it. No client `authClient.signUp` is ever called;
  there is no public creation endpoint to abuse.
- **First access via magic link.** The customer signs in with the email used at checkout
  (BA magic-link / email-OTP). No password to set.
- **Repeat purchases unify automatically.** A later checkout with the same email attaches a
  new `Order` to the existing `users` row → all past orders live under one login.
- **Sign-in page explainer copy** (final wording via the `brand-voice` skill): for a visitor
  with no account, explain calmly, parent-facing — *you don't sign up here; just place an
  order, then sign in with the email you used at checkout; every order you place is saved to
  that same account, so you can order as many videos as you like.*

## /app — the customer area (MVP)
Routes under **`/app`** (Better Auth–gated via `proxy.ts` + layout):
- **`/app` (dashboard)** — the order list; each order shows the status-driven "building your
  video" timer, the proof/approve action, and the delivered video player. The emotional
  centerpiece.
- **`/app/profile`** — name, email, sign-out. Minimal for MVP.
- **`/sign-in`** (public) — magic-link sign-in + the no-account explainer above.

MVP scope = dashboard + profile + sign-in. No settings sprawl, no self-serve billing portal.

## Data model
**Staff auth (Payload native):**
- **`admins`** — `auth: true`; the `admin.user`; gates `/admin`. The only auth-enabled
  collection.

**Customer auth (Better Auth–owned, mirrored as plain Payload collections):**
- **`users`** — the BA user (no `auth: true`); owns orders.
- **`accounts`** — BA credentials/provider rows (where the hashed password / provider id
  lives).
- **`sessions`**, **`verifications`** — BA session + verification rows.

**Product data:**
- **`Orders`** — the spine. Fields: `owner` (→ `users`), Stripe refs (session / payment
  intent), product config (child name, plot/world, length, detail level), `assets`
  (→ Media photos), `proof` + `finalVideo` (→ Media), and **`status`** (enum, below).
- **`Media`** — uploaded child photos + the delivered video asset; access-controlled so
  only the owning customer (and admins) can read.

### Status enum — the engine of the dashboard timer
`paid → awaiting_assets → in_production → proof_ready → (revisions) → approved → delivered`
plus `refunded` / `cancelled`. The dashboard maps each status to a stage in the animated
"building your video" timeline; admin advances it from Payload; each transition can fire
an email.

## Flows
1. **Purchase.** Configurator (`#build`) → **Stripe Checkout** (hosted). On
   `checkout.session.completed` webhook (server-side, via the adapter/Local API): upsert the
   `users` row by Stripe email, create the `Order` (status `paid`) owned by it, and email a
   **magic-link** "your video is underway — sign in to track it." Success page deep-links to
   `/app`.
2. **Asset collection.** First dashboard task when `awaiting_assets`: upload the child's
   photos + confirm details. (Collected **after** payment so we never hold child PII from
   non-buyers and checkout stays fast.)
3. **Production (admin / us).** In Payload `/admin`: advance `status`, upload a proof, upload
   the final video. Status changes drive customer emails.
4. **Customer (`/app`, Better Auth–gated).** The **status-driven "building your video" timer
   animation**; upload photos when `awaiting_assets`; **view + approve / request a tweak**
   when `proof_ready`; a **video player + download** when `delivered`. Reduced-motion users
   get a static progress indicator.

## Error handling & edges
- **Stripe webhooks:** signature verification + **idempotency** (a session/event processed
  once); reconcile via `payment_intent` on retries. Account creation is idempotent — same
  email re-uses the existing `users` row.
- **Refunds/disputes:** `charge.refunded` / dispute events → set `status` to
  `refunded`/`cancelled`; revoke video access.
- **Account claim / gift case:** buyer email ≠ recipient is fine — the account belongs to
  the **buyer**; the recipient is a detail of the order, not a separate account.
- **Photo uploads:** type/size limits, abuse considerations, **private** access only.
- **Video access:** signed URLs that **expire**; re-issued on dashboard load for the owner.
- **Magic-link auth:** expiring single-use tokens; resendable; rate-limited.
- **No-account visitor:** a stranger hitting `/sign-in` with an email that never purchased
  gets no account and a clear explainer (above), not an error.

## Testing
- Stripe in **test mode** (CLI) to replay `checkout.session.completed`, `charge.refunded`,
  and a duplicate event (idempotency + idempotent account upsert).
- **No public sign-up:** assert there is no client sign-up path and that an account is
  created *only* by the webhook. A second checkout with the same email attaches a new order
  to the same account.
- **Auth split:** a customer (`users`) cannot access `/admin`; an `admins` user gates the
  panel; cookies are distinct.
- Payload access-control tests: a customer reads **only** their own orders/media; admin
  reads all. (And: no dormant access rule pretends to enforce.)
- Dashboard renders the correct stage for each `status`; reduced-motion fallback.
- E2E happy path: configure → pay (test card) → magic-link in → upload photos → (admin flips
  status) → see timer advance → approve proof → watch delivered video.

## Phasing (suggested build order)
1. **Payload + Neon + admin** stood up in the Next app; `admins` (native auth) +
   `users/accounts/sessions/verifications` + `Orders`/`Media` schema.
2. **Better Auth** wired via the custom `createAdapterFactory` adapter (delieta pattern);
   `/api/auth/[...all]` handler; magic-link sign-in; `proxy.ts` + `/app` layout gating.
3. **Stripe Checkout** wired to the configurator + webhook → **checkout-gated account
   creation** + real `Order` creation.
4. **Dashboard** (`/app`): status timer, photo upload, proof approve, delivered video player;
   `/app/profile`; sign-in explainer copy (via `brand-voice`).
5. **Email** notifications on status transitions + the magic-link send.
(Each phase is independently shippable; the dashboard "delight" lands in phase 4.)

## Out of scope (for now)
- The **Series** subscription/app (stays a waitlist; these accounts are a future base for it).
- Any physical product / shipping (the product is a **digital video** — no fulfillment
  logistics, which is also why Shopify wasn't needed; see [[payments-stripe-over-shopify]]).
- Collaborative, multi-round revision tooling beyond a single optional proof/approve.
- Self-serve sign-up, password login, social login, org/multi-tenant, per-seat billing
  (delieta/syndcast have these; we don't need them for the MVP).

## Verify before / during build
- **Prerequisite — install the tool skill packs first** (before touching code), so we work
  from current authoritative docs, not stale training data:
  `npx skills add payloadcms/skills`, `npx skills add better-auth/skills`,
  `npx skills add shadcn/ui`, and the same for any other adopted library.
- **Use the `better-auth-with-payload` skill** (this repo) for the canonical adapter +
  dual-auth wiring. Reference implementation: the **delieta** repo's
  `src/lib/better-auth-payload-adapter.ts`, `src/lib/auth.ts`, `src/collections/auth/*`.
- **Do NOT use `@payload-auth/better-auth-db-adapter`** — deprecated; sign-in silently fails
  on this stack. Hand-roll the adapter via `createAdapterFactory`.
- Confirm **Stripe Individual onboarding** accepts the PESEL in practice (free to start).
- Pin **better-auth + payload** versions to the delieta-verified combo (BA 1.6.x / Payload
  3.85.x) on Next 16.2.6.
- Pick the **video host** (Mux vs Cloudflare Stream) on price + signed-playback DX.
- AGENTS.md rule: read the relevant `node_modules/next/dist/docs/` guide before writing
  Next 16 code — this stack uses App Router routes, route handlers (webhook), Server
  Components, and Next 16 Proxy (`proxy.ts`) heavily.
