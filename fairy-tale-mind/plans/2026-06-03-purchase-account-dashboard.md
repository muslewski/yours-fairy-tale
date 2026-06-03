---
type: plan
summary: "Build the purchase → account → dashboard app: Payload v3 foundation + dual auth (Better Auth customers / Payload native admins) + Stripe Checkout with checkout-gated account creation + the /app status dashboard + status emails."
tags: [checkout, configurator, auth, payload]
status: planned
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]", "[[payments-stripe-over-shopify]]"]
sources: []
implements: "[[2026-06-03-purchase-account-dashboard-design]]"
produced: []
---

# Purchase → Account → Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the simulated checkout into a real purchase → account → dashboard app where a parent pays via Stripe, gets an account auto-created by the checkout webhook (no public sign-up), and tracks a hand-animated video through production in a status dashboard.

**Architecture:** One Next.js 16 app. Payload v3 (mounted in-app) owns data + the `/admin` panel via its native auth on an `admins` collection. Better Auth handles customer accounts, bridged to Payload's DB through a custom `createAdapterFactory` adapter (NOT the `payload-auth` plugin). Stripe Checkout (hosted) is the only account-creation path: the `checkout.session.completed` webhook upserts the customer and creates the order. Customers reach `/app` via magic-link sign-in.

**Tech Stack:** Next.js 16.2.6 · React 19 · Payload v3.85.x · better-auth 1.6.x · Neon Postgres (`@payloadcms/db-postgres`, uuid ids) · Stripe Checkout + webhooks · Vercel Blob (private) + Mux/Cloudflare Stream · Resend · Tailwind v4 + the existing design system · Vitest.

---

## Plan conventions (read before executing)

This is a greenfield integration of fast-moving libraries. Two rules keep the code current and correct:

1. **Skill packs are the API source of truth.** Before writing code for a library, the matching pack MUST be installed (Task 0.1) and consulted: `payloadcms/skills`, `better-auth/skills`, `shadcn/ui`. Where a step shows library code, treat it as the *shape* and verify exact signatures against the pack + `node_modules/.../docs` (AGENTS.md rule). This is deliberate, not a placeholder.
2. **delieta is the verified reference for the auth layer.** It runs this *exact* stack (Next 16.2.6 · Payload 3.85 · better-auth 1.6.11). For the adapter, the auth collections, and the gating, adapt the real files at `/Users/muslewski/Documents/Repozytoria/delieta` (cited per task) rather than reinventing — and consult the `better-auth-with-payload` skill for the canonical pattern + the traps to avoid.

**Commit cadence:** one commit per task (steps end in a commit). Branch off `main` first.
**Env vars used:** `DATABASE_URI`, `PAYLOAD_SECRET`, `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `BLOB_READ_WRITE_TOKEN` (or S3 keys), `RESEND_API_KEY`, video-host keys.

---

## File structure (created/modified across the plan)

> **PATH CONVENTION (this repo):** root-level layout — there is **no `src/`**, and `@/*`
> maps to `./*` (see `tsconfig.json`). **Drop the `src/` prefix from every path below:**
> `src/lib/X` → `lib/X`, `src/collections/X` → `collections/X`, `src/app/X` → `app/X`,
> `src/proxy.ts` → `proxy.ts`. The paths are shown with `src/` only to mirror the delieta
> reference; translate them to root-level here. (delieta uses `src/`; we don't.)

```
src/payload.config.ts                         # Payload init: db (uuid), admin.user=admins, collections
src/collections/Admins.ts                     # Payload-native auth (staff) — the ONLY auth:true collection
src/collections/auth/Users.ts                 # BA user (plain, no auth:true)
src/collections/auth/Accounts.ts              # BA credentials/provider rows
src/collections/auth/Sessions.ts              # BA sessions
src/collections/auth/Verifications.ts         # BA verifications
src/collections/Orders.ts                     # order spine + status enum + owner→users
src/collections/Media.ts                      # photos + delivered video (private access)
src/lib/payload.ts                            # getPayloadClient() singleton
src/lib/better-auth-payload-adapter.ts        # BA → Payload Local API adapter (adapt delieta)
src/lib/auth.ts                               # betterAuth server instance (magic link)
src/lib/auth-client.ts                        # betterAuth client (no baseURL)
src/lib/customer-data.ts                      # server-only: getCustomerSession + owner-scoped order reads
src/proxy.ts                                  # Next 16 Proxy: optimistic cookie gate over /app/*
src/app/api/auth/[...all]/route.ts            # BA HTTP handler (outside (payload) group)
src/app/api/stripe/checkout/route.ts          # create Checkout Session from configurator
src/app/api/stripe/webhook/route.ts           # verify + idempotent → create customer + order
src/lib/stripe.ts                             # stripe SDK singleton + helpers
src/app/(app)/app/layout.tsx                  # authoritative getSession gate
src/app/(app)/app/page.tsx                    # dashboard: order list + status timer
src/app/(app)/app/profile/page.tsx            # profile (name/email/sign-out)
src/app/(app)/sign-in/page.tsx                # magic-link sign-in + no-account explainer
src/components/app/status-timeline.tsx        # status→stage animated timeline (Motion, reduced-motion)
src/components/app/asset-upload.tsx           # awaiting_assets photo upload → Media
src/components/app/proof-review.tsx           # proof_ready view + approve/request-tweak
src/components/app/video-player.tsx           # delivered video (signed URL)
src/lib/email.ts                              # Resend sender
src/emails/*.tsx                              # magic-link + status emails
vitest.config.ts, tests/**                    # test runner + tests
```

---

## Phase 0 — Scaffolding

### Task 0.1: Install skill packs + dependencies

**Files:** Modify `package.json` (deps).

- [ ] **Step 1: Install the tool skill packs** (API source of truth — do this before writing any library code)

```bash
npx skills add payloadcms/skills
npx skills add better-auth/skills
npx skills add shadcn/ui
```

- [ ] **Step 2: Install runtime deps** (pin Payload/BA to the delieta-verified combo)

```bash
npm i payload@^3.85 @payloadcms/next@^3.85 @payloadcms/db-postgres@^3.85 @payloadcms/richtext-lexical@^3.85 better-auth@^1.6 stripe @payloadcms/storage-vercel-blob@^3.85 resend
npm i -D vitest
```

- [ ] **Step 3: Commit**

```bash
git checkout -b feat/purchase-account-dashboard
git add package.json package-lock.json && git commit -m "chore: add payload, better-auth, stripe deps + skill packs"
```

### Task 0.2: Provision Neon Postgres + env

**Files:** Create `.env` (gitignored), modify `.env.example`.

- [ ] **Step 1:** Provision a Neon Postgres via the Vercel Marketplace (use the `vercel:marketplace` skill). Capture the connection string.
- [ ] **Step 2:** Add to `.env`: `DATABASE_URI`, `PAYLOAD_SECRET` (`openssl rand -hex 32`), `BETTER_AUTH_SECRET` (`openssl rand -hex 32`). Mirror keys (no values) into `.env.example`.
- [ ] **Step 3: Commit** `git add .env.example && git commit -m "chore: document env vars for payload/auth"`

### Task 0.3: Vitest smoke test

**Files:** Create `vitest.config.ts`, `tests/smoke.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/smoke.test.ts
import { expect, test } from "vitest";
test("vitest runs", () => { expect(1 + 1).toBe(2); });
```

- [ ] **Step 2: Run** `npx vitest run tests/smoke.test.ts` → Expected: PASS (create a minimal `vitest.config.ts` if it errors on config).
- [ ] **Step 3: Commit** `git add vitest.config.ts tests/ && git commit -m "test: add vitest"`

---

## Phase 1 — Payload foundation + schema + admin auth

> Consult `payloadcms/skills` for exact v3.85 config signatures. Reference delieta `src/payload.config.ts` + `src/lib/payload.ts`.

### Task 1.1: Payload config + client singleton

**Files:** Create `src/payload.config.ts`, `src/lib/payload.ts`. Test: `tests/payload/boot.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/payload/boot.test.ts
import { expect, test } from "vitest";
import { getPayloadClient } from "@/lib/payload";
test("payload boots and exposes the expected collections", async () => {
  const p = await getPayloadClient();
  const slugs = p.config.collections.map((c) => c.slug);
  expect(slugs).toEqual(expect.arrayContaining(
    ["admins","users","accounts","sessions","verifications","orders","media"]));
});
```

- [ ] **Step 2: Run** `npx vitest run tests/payload/boot.test.ts` → Expected: FAIL (module/collection missing).
- [ ] **Step 3: Implement** `src/lib/payload.ts` (memoized `getPayload({ config })`) and `src/payload.config.ts` with:
  - `db: postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI }, idType: "uuid" })`
  - `admin: { user: "admins" }`
  - `collections: [Admins, Users, Accounts, Sessions, Verifications, Orders, Media]`
  - `secret: process.env.PAYLOAD_SECRET`
  (Stub the collection imports now; they land in 1.2–1.4. Verify the adapter import path against the skill pack.)
- [ ] **Step 4: Run** the test again → Expected: still FAIL until Task 1.4 lands all collections — that's the expected cross-task ordering. Re-run after Task 1.4 → PASS. (Until then, the config imports stub collection objects so Payload boots.)
- [ ] **Step 5: Commit** `git add src/payload.config.ts src/lib/payload.ts tests/payload && git commit -m "feat(payload): config + client singleton"`

### Task 1.2: Admins collection (Payload-native auth)

**Files:** Create `src/collections/Admins.ts`. Test: `tests/payload/admins.test.ts`.

- [ ] **Step 1: Write the failing test** — create an admin, assert it persists with an email.

```ts
import { expect, test } from "vitest";
import { getPayloadClient } from "@/lib/payload";
test("admins collection is auth-enabled and creates a staff user", async () => {
  const p = await getPayloadClient();
  const admin = p.config.collections.find((c) => c.slug === "admins");
  expect(admin?.auth).toBeTruthy(); // ONLY this collection is auth:true
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `Admins.ts`: `{ slug: "admins", auth: true, admin: { useAsTitle: "email" }, fields: [{ name: "name", type: "text" }] }`. (This is the `/admin` login for staff/devs. See delieta `src/collections/Admins.ts`.)
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(payload): Admins collection (native staff auth)"`

### Task 1.3: Better Auth collections (plain, BA field names 1:1)

**Files:** Create `src/collections/auth/{Users,Accounts,Sessions,Verifications}.ts`. Test: `tests/payload/auth-collections.test.ts`.

- [ ] **Step 1: Write the failing test** — assert `users` is NOT auth-enabled and has BA's camelCase fields; `accounts` holds the credential fields.

```ts
test("users is a plain collection (BA owns credentials)", async () => {
  const p = await getPayloadClient();
  const users = p.config.collections.find((c) => c.slug === "users");
  expect(users?.auth).toBeFalsy(); // BA owns credentials on `accounts`
  const fields = users!.fields.map((f: any) => f.name);
  expect(fields).toEqual(expect.arrayContaining(["email","emailVerified","name"]));
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the four collections mirroring BA's field names exactly (camelCase). Adapt delieta `src/collections/auth/*` verbatim (Users: email, emailVerified, name, image; Accounts: userId, accountId, providerId, password, tokens; Sessions: userId, token, expiresAt, ipAddress, userAgent; Verifications: identifier, value, expiresAt). Keep `admin.hidden` off so rows are inspectable in `/admin`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(payload): Better Auth collections (users/accounts/sessions/verifications)"`

### Task 1.4: Orders + Media collections

**Files:** Create `src/collections/Orders.ts`, `src/collections/Media.ts`. Test: `tests/payload/orders.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
test("orders default to status 'paid' and require an owner", async () => {
  const p = await getPayloadClient();
  const orders = p.config.collections.find((c) => c.slug === "orders");
  const status = orders!.fields.find((f: any) => f.name === "status");
  expect(status.options.map((o: any) => o.value ?? o)).toEqual(expect.arrayContaining(
    ["paid","awaiting_assets","in_production","proof_ready","revisions","approved","delivered","refunded","cancelled"]));
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:**
  - `Orders.ts`: fields — `owner` (relationship → `users`, required), `stripeSessionId` (text, unique), `stripePaymentIntentId` (text), `childName`, `world` (select), `length`, `detailLevel`, `assets` (relationship → media, hasMany), `proof` (rel → media), `finalVideo` (rel → media), `status` (select, the enum above, default `paid`). Access: `read/update/delete: adminOnly` (customer reads go through `customer-data.ts`, Task 2.6).
  - `Media.ts`: an upload collection wired to the blob adapter (`@payloadcms/storage-vercel-blob`, private), `read: adminOnly` (signed access added in Task 4.4).
- [ ] **Step 4: Run** → PASS; also re-run `tests/payload/boot.test.ts` (now green).
- [ ] **Step 5: Commit** `git commit -am "feat(payload): Orders (status enum) + Media collections"`

---

## Phase 2 — Better Auth + adapter + sign-in + /app gating

> **Use the `better-auth-with-payload` skill.** Adapt delieta `src/lib/better-auth-payload-adapter.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/proxy.ts`.

### Task 2.1: BA → Payload Local API adapter

**Files:** Create `src/lib/better-auth-payload-adapter.ts`. Test: `tests/auth/adapter.test.ts`.

- [ ] **Step 1: Write the failing test** — adapter create+findOne round-trips a user row.

```ts
test("adapter creates and reads a BA user via Payload", async () => {
  const a = payloadBetterAuthAdapter({} as any); // factory → adapter instance per BA API
  const created = await a.create({ model: "user", data: { email: "t@x.io", name: "T", emailVerified: false } });
  const found = await a.findOne({ model: "user", where: [{ field: "email", value: "t@x.io", operator: "eq" }] });
  expect(found?.email).toBe("t@x.io");
  expect(typeof created.id).toBe("string"); // DB-minted uuid
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** by adapting delieta's adapter: `createAdapterFactory` from `better-auth/adapters`; `MODEL_TO_SLUG` (`user→users`, `session→sessions`, `account→accounts`, `verification→verifications`); CRUD via `getPayloadClient()` at `depth: 0`; `whereConditionFor` translating BA operators (`eq/ne/in/lt/lte/gt/gte/contains/starts_with/ends_with`); config `disableIdGeneration: true, transaction: false, supportsDates/Booleans/JSON: true`; manual offset trim in `findMany`. Verify the `better-auth/adapters` surface against the BA skill pack (it can shift across minors).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(auth): Better Auth → Payload Local API adapter"`

### Task 2.2: BA server + client

**Files:** Create `src/lib/auth.ts`, `src/lib/auth-client.ts`. Test: `tests/auth/server.test.ts`.

- [ ] **Step 1: Write the failing test** — `auth` exposes `api.getSession`; magic-link plugin present; email/password NOT enabled (no public password sign-up).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `auth.ts`: `betterAuth({ database: payloadBetterAuthAdapter, secret: BETTER_AUTH_SECRET, trustedOrigins: [...], plugins: [magicLink({ sendMagicLink: ... })] })` — **no `emailAndPassword`** (accounts come only from the webhook; sign-in is magic-link). `auth-client.ts`: `createAuthClient({ plugins: [magicLinkClient()] })` with **no `baseURL`** (use current origin — delieta's CORS lesson). Confirm magic-link API names against the BA skill pack.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(auth): betterAuth server + client (magic-link, no public password signup)"`

### Task 2.3: BA HTTP handler

**Files:** Create `src/app/api/auth/[...all]/route.ts`.

- [ ] **Step 1:** Implement `export const { GET, POST } = toNextJsHandler(auth);` (import `auth` from `@/lib/auth`). Mount **outside** any `(payload)` route group.
- [ ] **Step 2: Verify** `curl localhost:3000/api/auth/get-session` returns 200/JSON (dev server running).
- [ ] **Step 3: Commit** `git commit -am "feat(auth): mount Better Auth route handler"`

### Task 2.4: Optimistic gate (proxy.ts)

**Files:** Create `src/proxy.ts`. Test: `tests/auth/proxy.test.ts` (unit-test the redirect decision).

- [ ] **Step 1: Write the failing test** — no session cookie on `/app` → redirect to `/sign-in`; cookie present → pass.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** Next 16 Proxy using `getSessionCookie(request)` from `better-auth/cookies` (presence only, no DB hit); `config.matcher = ["/app/:path*"]`. (Next 16 renamed Middleware → Proxy; confirm the file name/exports against the Next docs per AGENTS.md.)
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(auth): optimistic /app gate via proxy"`

### Task 2.5: /sign-in page + no-account explainer

**Files:** Create `src/app/(app)/sign-in/page.tsx`. Copy via the `brand-voice` skill.

- [ ] **Step 1:** Build a client form calling `authClient.signIn.magicLink({ email })`; on success show "check your email."
- [ ] **Step 2:** Add the **no-account explainer** (use `brand-voice` for final wording): you don't sign up here — place an order, then sign in with the email you used at checkout; every order is saved to that account, so you can order as many videos as you like. Use design-system tokens (`bg-brand-cream`, `text-brand-deep`, `shadow-comic`).
- [ ] **Step 3: Verify** in the browser: requesting a link for a non-customer email shows the explainer, not an error.
- [ ] **Step 4: Commit** `git commit -am "feat(app): magic-link sign-in + no-account explainer"`

### Task 2.6: Authoritative gate + customer data helper

**Files:** Create `src/app/(app)/app/layout.tsx`, `src/lib/customer-data.ts`. Test: `tests/auth/customer-data.test.ts`.

- [ ] **Step 1: Write the failing test** — `getOrdersForCurrentCustomer()` returns only orders whose `owner` === session user id.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement:** `customer-data.ts` — `getCustomerSession()` = `auth.api.getSession({ headers: await headers() })`; `getOrdersForCurrentCustomer()` = Local API `find({ collection: "orders", where: { owner: { equals: session.user.id } }, overrideAccess: true })` (explicit owner-scoped where — the delieta pattern; do NOT rely on Payload `req.user`). `app/layout.tsx` — call `getCustomerSession()`, `redirect("/sign-in")` if absent.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(app): authoritative session gate + owner-scoped order reads"`

---

## Phase 3 — Stripe Checkout + checkout-gated account creation

> Use the `stripe:stripe-best-practices` skill. Stripe in **test mode** throughout.

### Task 3.1: Stripe singleton + Checkout Session route

**Files:** Create `src/lib/stripe.ts`, `src/app/api/stripe/checkout/route.ts`. Test: `tests/stripe/checkout.test.ts`.

- [ ] **Step 1: Write the failing test** — POSTing a valid configurator payload returns a Checkout Session URL; the session carries the config in `metadata` and `customer_email` if provided.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `stripe.ts` (`new Stripe(STRIPE_SECRET_KEY)`); the route creates a `checkout.sessions.create({ mode: "payment", line_items, success_url: "/app?session={CHECKOUT_SESSION_ID}", cancel_url, customer_email, metadata: { childName, world, length, detailLevel } })`. Wire the configurator's primary CTA to POST here.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(checkout): create Stripe Checkout Session from configurator"`

### Task 3.2: Webhook → idempotent customer + order creation

**Files:** Create `src/app/api/stripe/webhook/route.ts`. Test: `tests/stripe/webhook.test.ts`.

- [ ] **Step 1: Write the failing test** — given a `checkout.session.completed` event, the handler: (a) upserts a `users` row by email, (b) creates an `orders` row (status `paid`) linked to it, (c) is idempotent (same `stripeSessionId` twice → one order), (d) a second session with the same email reuses the user.

```ts
test("webhook creates customer + order, idempotently", async () => {
  await handleStripeEvent(fakeCompletedSession({ email: "a@b.io", sessionId: "cs_1" }));
  await handleStripeEvent(fakeCompletedSession({ email: "a@b.io", sessionId: "cs_1" })); // dup
  const p = await getPayloadClient();
  const users = await p.find({ collection: "users", where: { email: { equals: "a@b.io" } } });
  const orders = await p.find({ collection: "orders", where: { stripeSessionId: { equals: "cs_1" } } });
  expect(users.totalDocs).toBe(1);
  expect(orders.totalDocs).toBe(1);
});
```

- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the route: verify signature with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)` (read the raw body — Next 16 route handler); switch on `checkout.session.completed`; extract a `handleStripeEvent` (export it for the test); upsert user via the BA adapter / Local API (find-by-email → create if absent — **no client signUp**); guard idempotency on `stripeSessionId` unique; create the order with `metadata`. Keep the handler pure/testable.
- [ ] **Step 4: Run** → PASS, then replay against the dev server: `stripe listen --forward-to localhost:3000/api/stripe/webhook` + `stripe trigger checkout.session.completed`.
- [ ] **Step 5: Commit** `git commit -am "feat(checkout): webhook creates customer + order (checkout-gated, idempotent)"`

### Task 3.3: Magic-link "video underway" email on creation

**Files:** Create `src/lib/email.ts`, `src/emails/welcome-magic-link.tsx`. Modify the webhook to send.

- [ ] **Step 1: Write the failing test** — after a new-customer order, a "sign in to track your video" email is queued to the buyer (assert the sender is called with the right address/subject; mock Resend).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** `email.ts` (Resend client + `sendEmail`), the email template, and call it from `handleStripeEvent` only for newly-created users, containing a magic-link sign-in CTA.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(checkout): email magic-link on account creation"`

### Task 3.4: Refund/dispute → status sync

**Files:** Modify `src/app/api/stripe/webhook/route.ts`. Test: extend `tests/stripe/webhook.test.ts`.

- [ ] **Step 1: Write the failing test** — `charge.refunded` for an order's payment intent sets its status to `refunded`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the `charge.refunded` / dispute branches → find order by `stripePaymentIntentId`, set `status: "refunded"`/`"cancelled"`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(checkout): refund/dispute → order status sync"`

---

## Phase 4 — The /app dashboard

> Use `shadcn/ui` + the existing design system (brand tokens, `shadow-comic`, Motion from `motion/react`, `useReducedMotion`). Customer copy via `brand-voice`. Apply `section-waves` if full-bleed sections are introduced.

### Task 4.1: Dashboard order list + status timeline

**Files:** Create `src/app/(app)/app/page.tsx`, `src/components/app/status-timeline.tsx`. Test: `tests/app/status-timeline.test.tsx`.

- [ ] **Step 1: Write the failing test** — the timeline marks the correct stage active for a given status (e.g. `in_production` → "We're animating" active, later stages inactive); reduced-motion renders a static variant.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** a `STATUS_STAGES` map (status → ordered stage index + parent-facing label) and the animated timeline (Motion, guarded by `useReducedMotion`). `app/page.tsx` calls `getOrdersForCurrentCustomer()` and renders a card per order with the timeline. This is the emotional centerpiece — keep copy calm/keepsake (brand-voice).
- [ ] **Step 4: Run** → PASS; eyeball in browser with seeded orders at each status.
- [ ] **Step 5: Commit** `git commit -am "feat(app): dashboard order list + animated status timeline"`

### Task 4.2: Photo upload (awaiting_assets)

**Files:** Create `src/components/app/asset-upload.tsx`. Modify `app/page.tsx`.

- [ ] **Step 1: Write the failing test** — upload posts files to a server action that creates private `media` docs linked to the order's `assets`; rejects non-image / oversized files.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the upload UI (shown only when `status === "awaiting_assets"`) + a server action that creates `media` (private) and attaches to `order.assets`, with type/size validation.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(app): child-photo upload for awaiting_assets"`

### Task 4.3: Proof review + approve

**Files:** Create `src/components/app/proof-review.tsx`. Test: `tests/app/proof-review.test.tsx`.

- [ ] **Step 1: Write the failing test** — when `status === "proof_ready"`, approving sets `approved`; "request a tweak" sets `revisions` with a note.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the proof view + two server actions (approve / request-tweak with a note field). Copy via brand-voice.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(app): proof review + approve/request-tweak"`

### Task 4.4: Delivered video player (signed URL)

**Files:** Create `src/components/app/video-player.tsx`, a signed-URL helper. 

- [ ] **Step 1: Write the failing test** — for a `delivered` order owned by the session user, the server issues a short-lived signed playback URL; a non-owner gets none.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the signed-URL helper (Mux/Cloudflare Stream signing — pick per spec's open item) gated by ownership, and the player shown when `status === "delivered"` with a download affordance.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(app): delivered video player with signed playback"`

### Task 4.5: Profile page

**Files:** Create `src/app/(app)/app/profile/page.tsx`.

- [ ] **Step 1:** Render name + email (read-only for MVP) + a sign-out button (`authClient.signOut()`).
- [ ] **Step 2: Verify** sign-out clears the session and redirects to `/sign-in`.
- [ ] **Step 3: Commit** `git commit -am "feat(app): profile page + sign-out"`

---

## Phase 5 — Status emails

### Task 5.1: Email on status transitions

**Files:** Create `src/emails/status-update.tsx`; add an `afterChange` hook on `Orders`. Test: `tests/app/order-status-email.test.ts`.

- [ ] **Step 1: Write the failing test** — changing an order's `status` to `proof_ready` / `delivered` queues the matching email to the owner; non-status edits don't.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** an `Orders` `afterChange` hook that, on a `status` change to a notifying value, sends the owner the matching template via `sendEmail`. Templates via brand-voice.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(app): status-transition emails"`

---

## Final verification (before declaring done)

- [ ] Full suite green: `npx vitest run`.
- [ ] **E2E happy path** (dev server + `stripe listen`): configure → pay (test card `4242…`) → receive magic link → sign in → `/app` shows the order → upload photos → (flip status in `/admin`) → timeline advances → proof → approve → `delivered` → watch video.
- [ ] **Auth split:** a customer cannot reach `/admin`; an `admins` user can; cookies are distinct (`payload-token` vs `better-auth.session_token`).
- [ ] **No public sign-up:** there is no client sign-up path; only the webhook creates accounts; a non-customer email at `/sign-in` sees the explainer.
- [ ] **Mind maintenance:** add/refresh zone cards for the new `auth`/`checkout-app` surfaces, re-stamp `verifiedAt`, add `map/decisions/` records for any non-obvious build choices (e.g. video-host pick), file `tech-debt/` for deferrals (email verification flow, real `req.user` bridge), run `npm run mind`, commit `map/index.md`.

## Out of scope (per spec)
Series subscription/app; physical fulfillment; self-serve/password/social sign-up; org/multi-tenant; per-seat billing; multi-round revision tooling beyond one proof.
