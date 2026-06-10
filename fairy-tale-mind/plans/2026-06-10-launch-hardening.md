# Launch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the post-payment product flow production-true for the MVP launch with real Stripe: real waitlist, real social links, Vercel Blob storage, retry-safe webhooks, fail-loud email/env config, and accurate onboarding docs.

**Architecture:** Each fix follows an existing in-repo pattern: the waitlist mirrors the contact form/route/lib triad; Blob storage uses Payload's pass-through mode so `read: adminOnly` keeps gating file URLs while the ownership-checked video route proxies bytes from Blob; webhook out-of-order events flip from silent-drop to throw-for-retry; production env validation runs in `instrumentation.ts` before migrations (fail closed).

**Tech Stack:** Next.js 16 App Router, Payload v3 (Postgres/Neon, uuid PKs), Better Auth 1.6.11 (magic link), Stripe, Resend, `@payloadcms/storage-vercel-blob` + `@vercel/blob`, Vitest (DB-backed) + Playwright.

**Decisions already made (by the owner, 2026-06-10):**
- Launching soon with real Stripe → these tasks are the critical path.
- Video/media storage: Vercel Blob.
- Waitlist: persist signup + send a Resend thank-you email.
- Socials: Instagram `https://www.instagram.com/yoursfairytale7/`, Facebook `https://www.facebook.com/yoursfairytale7/`, TikTok `https://www.tiktok.com/@yoursfairytale7` (Facebook replaces the current Pinterest placeholder).
- Legal pages: unchanged.
- `better-auth` stays pinned at 1.6.11 through launch; revisit after.

**Out of scope (deliberate):** code-level rate limiting (use Vercel Firewall rules at launch — ops checklist below), ESLint adoption (post-launch), CSP (documented deferral in next.config.ts), private-Blob signed URLs (post-MVP; the proxied delivery below keeps ownership gating).

**Launch ops checklist (not code; do in Vercel dashboard):**
1. Add Blob store to the project (auto-sets `BLOB_READ_WRITE_TOKEN`).
2. Set all env vars from `.env.example` in Production (and Preview where sensible).
3. Add Vercel Firewall rate-limit rules for `POST /api/contact`, `POST /api/waitlist`, `POST /api/stripe/checkout`, `POST /api/auth/*`.
4. Point the Stripe webhook endpoint (live mode) at `/api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`.
5. After first deploy: run the `@smoke` purchase test against test mode, then a real $1-tier live test.

**Sandbox note:** if no `.env`/`.env.test` with real DB credentials exists, DB-backed vitest files fail at Payload boot. In that case verify with `npx tsc --noEmit` plus the pure subset (`npx vitest run tests/lib/pricing.test.ts tests/contact/route.test.ts tests/stripe/checkout.test.ts`) and let CI run the full suite. Steps below note which tests are DB-backed.

---

## File structure

| File | Responsibility |
|---|---|
| `components/home/site-footer.tsx` (modify) | Real social links |
| `lib/customer-data.ts` (modify) | Unbounded, newest-first order list |
| `app/api/stripe/webhook/route.ts` (modify) | Throw on out-of-order refund/dispute |
| `lib/email.ts` (modify) | Fail loud in production when unconfigured |
| `lib/auth.ts` (modify) | Rethrow magic-link send failures |
| `lib/required-env.ts` (create) | Pure list of prod-required env vars |
| `instrumentation.ts` (modify) | Fail-closed prod env validation |
| `collections/Waitlist.ts` (create) | Waitlist collection (email unique, lowercased) |
| `lib/waitlist.ts` (create) | Validation + thank-you email + submit |
| `app/api/waitlist/route.ts` (create) | Public POST endpoint |
| `components/series/waitlist-form.tsx` (modify) | Real fetch + loading/error states |
| `migrations/20260610_000000_waitlist.ts` (create) + `migrations/index.ts` (modify) | Prod schema |
| `payload.config.ts` (modify) | Register Waitlist + vercelBlobStorage plugin |
| `app/(app)/api/orders/[id]/video/route.ts` + `lib/video-access.ts` (modify) | Blob-backed gated video delivery |
| `lib/order-upload-validation.ts` + new `components/app/prepare-upload.ts` + `components/app/photo-upload.tsx` (modify) | Photos survive Vercel's 4.5 MB request cap |
| `next.config.ts` (modify) | Server-action body size limit |
| `.env.example` (create), `.gitignore`, `README.md`, `CLAUDE.md`, `components/checkout/README.md`, `.github/workflows/test.yml` (modify) | Onboarding + CI typecheck |
| `fairy-tale-mind/**` | Zone cards, decisions, debt closures, regenerated index |

---

### Task 0: Bootstrap and baseline

**Files:** none (environment only)

- [ ] **Step 0.1: Install dependencies**

Run: `npm ci`
Expected: completes without error; `node_modules/` exists.

- [ ] **Step 0.2: Read the Next 16 vendored docs (AGENTS.md mandate) for the two config surfaces this plan touches**

Run: `grep -rln "bodySizeLimit" node_modules/next/dist/docs/ | head -3` and `grep -rln "typegen" node_modules/next/dist/docs/ | head -3`
Read the matching doc files. Record: (a) the exact config path for the server-action body size limit in Next 16 (historically `experimental.serverActions.bodySizeLimit`, may have moved), (b) whether `next typegen` exists for generating `next-env.d.ts`/route types without a full build. Use whatever the docs say in Tasks 8 and 9 — the code below assumes `serverActions.bodySizeLimit` is still honored; adjust to the documented shape if it moved.

- [ ] **Step 0.3: Typecheck baseline**

Run: `npx next typegen 2>/dev/null || true; npx tsc --noEmit`
Expected: PASS (zero errors). If pre-existing errors appear, fix nothing yet — record them; they must not grow.

- [ ] **Step 0.4: Create a local `.env` so vitest's `setup-env.ts` can load (sandbox only — skip if a real `.env`/`.env.test` exists)**

```bash
cat > .env <<'EOF'
DATABASE_URI=postgresql://placeholder:placeholder@localhost:5432/placeholder
PAYLOAD_SECRET=local-placeholder-secret
BETTER_AUTH_SECRET=local-placeholder-secret
STRIPE_SECRET_KEY=sk_test_placeholder
EOF
```
This file is gitignored. Pure tests now run; DB-backed tests still fail locally (CI covers them).

---

### Task 1: Real footer social links

**Files:**
- Modify: `components/home/site-footer.tsx:39` (the `SOCIALS` array) and `:142-155` (the render)
- Read first: `components/motion/stagger.tsx` (confirm `StaggerItem as="a"` forwards `target`/`rel`; it spreads props onto the motion element — if it does not, render a plain `<motion.a>` with the same `whileHover={hoverPop} whileTap={tapPop}` instead)

- [ ] **Step 1.1: Replace the placeholder array**

```tsx
const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/yoursfairytale7/" },
  { label: "Facebook", href: "https://www.facebook.com/yoursfairytale7/" },
  { label: "TikTok", href: "https://www.tiktok.com/@yoursfairytale7" },
];
```

- [ ] **Step 1.2: Update the render to use real hrefs and open externally**

```tsx
{SOCIALS.map((s) => (
  <StaggerItem
    key={s.label}
    as="a"
    href={s.href}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={hoverPop}
    whileTap={tapPop}
    className="rounded-lg border-[3px] border-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70 transition-colors hover:border-white hover:text-white"
  >
    {s.label}
  </StaggerItem>
))}
```

- [ ] **Step 1.3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 1.4: Commit**

```bash
git add components/home/site-footer.tsx
git commit -m "fix(footer): real social links (Instagram, Facebook, TikTok) replace href=\"#\" placeholders"
```

---

### Task 2: Remove the silent 10-order cap

**Files:**
- Modify: `lib/customer-data.ts:38-49` (`getOrdersForOwner`)
- Test: `tests/auth/gating.test.ts` (DB-backed — runs in CI)

- [ ] **Step 2.1: Write the failing test** — append to `tests/auth/gating.test.ts`, reusing that file's existing user/order factory helpers (it already creates users and orders; follow its cleanup pattern):

```ts
test("getOrdersForOwner returns more than Payload's default page of 10", async () => {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: { email: `cap-test-${Date.now()}@example.com`, emailVerified: true },
    overrideAccess: true,
  });
  const created: string[] = [];
  for (let i = 0; i < 11; i++) {
    const order = await payload.create({
      collection: "orders",
      data: { owner: user.id, status: "paid", childName: `Cap ${i}` },
      overrideAccess: true,
    });
    created.push(String(order.id));
  }
  const result = await getOrdersForOwner(String(user.id));
  expect(result.length).toBe(11);
  // cleanup
  for (const id of created)
    await payload.delete({ collection: "orders", id, overrideAccess: true });
  await payload.delete({ collection: "users", id: user.id, overrideAccess: true });
});
```

- [ ] **Step 2.2: Run it to confirm it fails** (requires DB)

Run: `npx vitest run tests/auth/gating.test.ts -t "more than Payload"`
Expected: FAIL — `expected 10 to be 11`. (No DB locally → defer the red/green check to CI; still do Step 2.3.)

- [ ] **Step 2.3: Fix `getOrdersForOwner`**

```ts
export async function getOrdersForOwner(ownerId: string) {
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "orders",
    where: {
      owner: { equals: ownerId },
    },
    overrideAccess: true,
    depth: 0,
    // A customer must see ALL their orders — Payload's find() defaults to a
    // 10-doc page, which silently hid the 11th order.
    pagination: false,
    sort: "-createdAt",
  });
  return result.docs;
}
```

- [ ] **Step 2.4: Run the test again** — Expected: PASS (in CI if no local DB).

- [ ] **Step 2.5: Commit**

```bash
git add lib/customer-data.ts tests/auth/gating.test.ts
git commit -m "fix(app): customer order list no longer capped at Payload's default 10 docs"
```

---

### Task 3: Webhook — out-of-order refund/dispute events retry instead of vanishing

**Files:**
- Modify: `app/api/stripe/webhook/route.ts:114-119` and `:154-159`
- Test: `tests/stripe/webhook.test.ts` (DB-backed)

- [ ] **Step 3.1: Check for existing tests that assert the silent-skip behavior**

Run: `grep -n "no order" tests/stripe/*.ts`
Any test asserting `resolves` for an orphan refund/dispute must be updated to `rejects` in Step 3.2.

- [ ] **Step 3.2: Write/adjust tests** — in `tests/stripe/webhook.test.ts`:

```ts
test("charge.refunded with no matching order throws so Stripe retries", async () => {
  const ev = {
    id: "evt_test_orphan_refund",
    type: "charge.refunded",
    data: { object: { id: "ch_orphan", payment_intent: "pi_orphan_never_existed" } },
  } as unknown as Stripe.Event;
  await expect(handleStripeEvent(ev)).rejects.toThrow(/no order yet/);
});

test("charge.dispute.created with no matching order throws so Stripe retries", async () => {
  const ev = {
    id: "evt_test_orphan_dispute",
    type: "charge.dispute.created",
    data: { object: { id: "dp_orphan", payment_intent: "pi_orphan_never_existed" } },
  } as unknown as Stripe.Event;
  await expect(handleStripeEvent(ev)).rejects.toThrow(/no order yet/);
});
```

- [ ] **Step 3.3: Run to confirm they fail** (DB) — Expected: FAIL (`resolved` instead of rejecting).

- [ ] **Step 3.4: Implement** — replace both "no order found" blocks. For `charge.refunded` (route.ts:114-119):

```ts
    if (existing.totalDocs === 0) {
      // Out-of-order delivery: Stripe does not guarantee event ordering, so this
      // refund may arrive before checkout.session.completed has created the
      // order. THROW (→ 500 → Stripe retries with backoff) instead of returning
      // 200, which would permanently drop the refund and leave the order "paid".
      throw new Error(
        `charge.refunded: no order yet for payment_intent ${paymentIntentId} — failing so Stripe retries`,
      );
    }
```

And for `charge.dispute.created` (route.ts:154-159):

```ts
    if (existing.totalDocs === 0) {
      // Same out-of-order rationale as charge.refunded above.
      throw new Error(
        `charge.dispute.created: no order yet for payment_intent ${paymentIntentId} — failing so Stripe retries`,
      );
    }
```

Keep the `!paymentIntentId` warn-and-return branches as they are (no payment intent will never match later — retrying is pointless).

- [ ] **Step 3.5: Run the webhook suite** (DB) — `npx vitest run tests/stripe/webhook.test.ts` — Expected: PASS.

- [ ] **Step 3.6: Commit**

```bash
git add app/api/stripe/webhook/route.ts tests/stripe/webhook.test.ts
git commit -m "fix(stripe): out-of-order refund/dispute events now 500 for retry instead of being dropped"
```

---

### Task 4: Email and env config fail loud in production

**Files:**
- Modify: `lib/email.ts:17-22`, `lib/auth.ts:91-99`, `instrumentation.ts`
- Create: `lib/required-env.ts`
- Test: `tests/lib/required-env.test.ts` (pure), `tests/auth/magic-link-email.test.ts` (check existing expectations)

- [ ] **Step 4.1: Write the pure test** — create `tests/lib/required-env.test.ts`:

```ts
import { expect, test } from "vitest";

import { missingProductionEnv, REQUIRED_PRODUCTION_ENV } from "@/lib/required-env";

test("returns every missing var", () => {
  expect(missingProductionEnv({})).toEqual(REQUIRED_PRODUCTION_ENV);
});

test("returns empty when all present", () => {
  const env = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((k) => [k, "set"]));
  expect(missingProductionEnv(env)).toEqual([]);
});

test("empty string counts as missing", () => {
  const env = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((k) => [k, "set"]));
  env.RESEND_API_KEY = "";
  expect(missingProductionEnv(env)).toEqual(["RESEND_API_KEY"]);
});
```

- [ ] **Step 4.2: Run it** — `npx vitest run tests/lib/required-env.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4.3: Create `lib/required-env.ts`**

```ts
/**
 * Production env contract — the single list of vars a real deploy MUST have.
 *
 * Checked fail-closed in instrumentation.ts on production boot: a deploy with
 * a missing var 500s every request instead of silently degrading (e.g. a
 * missing RESEND_API_KEY would otherwise disable magic-link sign-in — the ONLY
 * sign-in path — with nothing but a console.warn as evidence).
 *
 * DATABASE_URI/POSTGRES_URL, PAYLOAD_SECRET, BETTER_AUTH_SECRET and
 * STRIPE_SECRET_KEY already fail-fast at module import; they are listed here
 * too so the boot error names EVERYTHING missing at once.
 */
export const REQUIRED_PRODUCTION_ENV = [
  "PAYLOAD_SECRET",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "NEXT_PUBLIC_APP_URL",
  "BLOB_READ_WRITE_TOKEN",
] as const satisfies readonly string[];

export function missingProductionEnv(
  env: Record<string, string | undefined>,
): string[] {
  return REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]);
}
```

- [ ] **Step 4.4: Run the test** — Expected: PASS.

- [ ] **Step 4.5: Wire into `instrumentation.ts`** — inside the existing guard, BEFORE migrations:

```ts
export async function register(): Promise<void> {
  // Inline guard mirrors shouldRunMigrations(); kept here so the edge runtime and
  // non-prod envs skip the dynamic import of the Payload-heavy migration module.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.VERCEL_ENV === "production"
  ) {
    // Fail closed: a production deploy with missing config must not come up
    // half-working (silent email loss, localhost success_urls). Throwing here
    // 500s every request, which is loud, visible, and safe.
    const { missingProductionEnv } = await import("@/lib/required-env");
    const missing = missingProductionEnv(process.env);
    if (missing.length > 0) {
      throw new Error(
        `[boot] Missing required production env vars: ${missing.join(", ")}`,
      );
    }

    const { runProductionMigrations } = await import("@/lib/run-migrations");
    await runProductionMigrations();
  }
}
```

- [ ] **Step 4.6: Make `lib/email.ts` strict in production** — replace lines 18-22:

```ts
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev convenience only. In production this is a hard error: silently
    // dropping mail would break magic-link sign-in (the only sign-in path)
    // and order confirmations with no visible symptom.
    if (process.env.NODE_ENV === "production") {
      throw new Error("[email] RESEND_API_KEY is not set in production.");
    }
    console.warn("[email] RESEND_API_KEY is not set — skipping email send (dev only).");
    return;
  }
```

- [ ] **Step 4.7: Stop swallowing magic-link send failures** — in `lib/auth.ts`, the `sendMagicLink` catch (lines 91-99):

```ts
        try {
          await sendEmail({
            to: email,
            subject: "Your Yours Fairy Tale sign-in link",
            html: buildMagicLinkEmail(link),
          });
        } catch (err) {
          console.error("[auth] magic-link email failed:", err);
          // Rethrow so Better Auth surfaces an error to the client; the sign-in
          // page then shows its gentle error state instead of a false
          // "check your email" success.
          throw err;
        }
```

(The sign-in page already renders `errorMessage` whenever `result.error` is set — `app/(app)/sign-in/page.tsx:41-46` — so no client change is needed.)

- [ ] **Step 4.8: Check existing magic-link tests still hold**

Run: `npx vitest run tests/auth/magic-link-email.test.ts tests/lib/required-env.test.ts` (pure)
Expected: PASS. If a test asserted the swallow behavior, update it to assert the rethrow.

- [ ] **Step 4.9: Typecheck + commit**

```bash
npx tsc --noEmit
git add lib/required-env.ts lib/email.ts lib/auth.ts instrumentation.ts tests/lib/required-env.test.ts
git commit -m "feat(ops): fail-closed production env validation; email failures are loud, magic-link errors reach the user"
```

---

### Task 5: Scope trustedOrigins (drop the `*.vercel.app` wildcard)

**Files:**
- Modify: `lib/auth.ts:43-53`
- Test: `tests/auth/server.test.ts`

- [ ] **Step 5.1: Write the failing test** — append to `tests/auth/server.test.ts` (match its existing import style):

```ts
test("trustedOrigins never trusts all of vercel.app", () => {
  const origins = auth.options.trustedOrigins as string[];
  expect(origins).not.toContain("https://*.vercel.app");
  for (const o of origins) expect(o).not.toMatch(/\*/);
});
```

- [ ] **Step 5.2: Run it** — `npx vitest run tests/auth/server.test.ts` — Expected: FAIL (wildcard present). (This file imports `lib/auth` only; it runs without a DB.)

- [ ] **Step 5.3: Implement** — replace the `trustedOrigins` block in `lib/auth.ts`:

```ts
// Origins Better Auth will accept requests from. Production domains are listed
// explicitly; Vercel previews are trusted ONLY via this project's own
// deployment URLs (VERCEL_URL / VERCEL_BRANCH_URL), injected per-deploy by
// Vercel. NEVER use a `*.vercel.app` wildcard — anyone can host there, which
// would hand CSRF/origin trust to arbitrary third parties.
const trustedOrigins = [
  "http://localhost:1234",
  "http://localhost:3000",
  "http://localhost:3002",
  "https://yoursfairytale.com",
  "https://www.yoursfairytale.com",
];
for (const host of [
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
]) {
  if (host) trustedOrigins.push(`https://${host}`);
}
```

- [ ] **Step 5.4: Run the test** — Expected: PASS.

- [ ] **Step 5.5: Commit**

```bash
git add lib/auth.ts tests/auth/server.test.ts
git commit -m "fix(auth): trust only this project's deploy URLs, not every *.vercel.app origin"
```

---

### Task 6: Real waitlist — collection, route, thank-you email, form

**Files:**
- Create: `collections/Waitlist.ts`, `lib/waitlist.ts`, `app/api/waitlist/route.ts`, `migrations/20260610_000000_waitlist.ts`, `tests/waitlist/waitlist.test.ts`, `tests/waitlist/route.test.ts`, `e2e/waitlist.spec.ts`
- Modify: `payload.config.ts` (collections list), `migrations/index.ts`, `components/series/waitlist-form.tsx`

- [ ] **Step 6.1: Write the pure validation + email tests** — create `tests/waitlist/waitlist.test.ts`:

```ts
import { expect, test } from "vitest";

import { validateWaitlistInput, buildWaitlistEmail } from "@/lib/waitlist";

test("rejects a filled honeypot", () => {
  const r = validateWaitlistInput({ email: "a@b.co", company: "bot inc" });
  expect(r.ok).toBe(false);
});

test("rejects an invalid email", () => {
  expect(validateWaitlistInput({ email: "nope" }).ok).toBe(false);
  expect(validateWaitlistInput({}).ok).toBe(false);
});

test("normalizes email to trimmed lowercase", () => {
  const r = validateWaitlistInput({ email: "  Ada@Example.COM " });
  expect(r).toEqual({ ok: true, email: "ada@example.com" });
});

test("thank-you email is branded and calm", () => {
  const html = buildWaitlistEmail();
  expect(html).toContain("You're on the list");
  expect(html).toContain("Create their video");
  expect(html).not.toMatch(/!{2,}|Pow!|Kapow!/);
});
```

- [ ] **Step 6.2: Run** — `npx vitest run tests/waitlist/waitlist.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 6.3: Create `collections/Waitlist.ts`**

```ts
import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

/**
 * Series waitlist signups (the /series page form).
 *
 * Rows are created ONLY by app/api/waitlist/route.ts via the Local API with
 * overrideAccess — the public REST/GraphQL surface stays staff-only, same as
 * Orders. Email is unique + lowercased so a parent signing up twice is a
 * no-op, not a duplicate row.
 */
export const Waitlist: CollectionConfig = {
  slug: "waitlist",
  admin: {
    useAsTitle: "email",
    group: "Commerce",
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
      // Same canonicalization as users.email (see collections/auth/Users.ts).
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === "string" ? value.trim().toLowerCase() : value,
        ],
      },
    },
    {
      name: "source",
      type: "text",
      admin: { description: "Where the signup came from (e.g. \"series\")." },
    },
  ],
  timestamps: true,
};
```

- [ ] **Step 6.4: Register it in `payload.config.ts`** — add `import { Waitlist } from "./collections/Waitlist";` with the other collection imports, and add `Waitlist,` to the `collections` array after `Orders,` (comment group: Commerce).

- [ ] **Step 6.5: Create `lib/waitlist.ts`**

```ts
/**
 * Series waitlist domain logic — validation, thank-you email, persistence.
 * Mirrors lib/contact.ts: pure pieces exported for unit tests, one submit
 * function composing them. Copy follows the brand-voice skill (calm, warm,
 * parent-facing, sentence case).
 */
import { sendEmail } from "@/lib/email";
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";
import { getPayloadClient } from "@/lib/payload";

export interface WaitlistInput {
  email?: string;
  /** Honeypot — must be empty. */
  company?: string;
}

export type WaitlistResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateWaitlistInput(
  input: WaitlistInput,
): { ok: true; email: string } | { ok: false; error: string } {
  if (input.company && input.company.trim() !== "") {
    return { ok: false, error: "We couldn't add you to the list just now." };
  }
  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please add a valid email address." };
  }
  return { ok: true, email };
}

export function buildWaitlistEmail(): string {
  const baseUrl =
    (process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yoursfairytale.com").replace(/\/$/, "");
  return renderBrandedEmail({
    preheader: "You're on the list for The Series.",
    heading: "You're on the list",
    accent: "pink",
    bodyHtml: emailParagraphs([
      "Thank you for your interest in The Series, an ongoing animated show with your child as the recurring hero.",
      "We are still crafting it. The moment it is ready, we will write to this address.",
      "Until then, every story starts with a single video, made just for them.",
    ]),
    cta: { label: "Create their video", href: `${baseUrl}/#build` },
  });
}

export async function submitWaitlistSignup(
  input: WaitlistInput,
): Promise<WaitlistResult> {
  const v = validateWaitlistInput(input);
  if (!v.ok) return v;

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: "waitlist",
    where: { email: { equals: v.email } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs > 0) {
    // Already on the list: success, and no second email.
    return { ok: true };
  }

  await payload.create({
    collection: "waitlist",
    data: { email: v.email, source: "series" },
    overrideAccess: true,
  });

  // Thank-you email is non-fatal: the signup is saved either way.
  try {
    await sendEmail({
      to: v.email,
      subject: "You're on the list for The Series",
      html: buildWaitlistEmail(),
    });
  } catch (err) {
    console.error("[waitlist] thank-you email failed (signup saved):", err);
  }
  return { ok: true };
}
```

- [ ] **Step 6.6: Run the pure tests** — Expected: PASS.

- [ ] **Step 6.7: Create `app/api/waitlist/route.ts`**

```ts
/**
 * POST /api/waitlist — public Series waitlist endpoint.
 * Mirrors /api/contact: bad input → 400; unexpected failure → 500.
 */
import { NextRequest, NextResponse } from "next/server";

import { submitWaitlistSignup, type WaitlistInput } from "@/lib/waitlist";

export async function POST(req: NextRequest) {
  let body: WaitlistInput;
  try {
    body = (await req.json()) as WaitlistInput;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await submitWaitlistSignup(body);
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist] signup failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't add you to the list just now. Please try again in a moment.",
      },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 6.8: Route tests** — create `tests/waitlist/route.test.ts` (mocks the lib, no DB):

```ts
import { expect, test, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/waitlist", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/waitlist")>();
  return { ...actual, submitWaitlistSignup: vi.fn() };
});
import { submitWaitlistSignup } from "@/lib/waitlist";
import { POST } from "@/app/api/waitlist/route";

const mockSubmit = vi.mocked(submitWaitlistSignup);
beforeEach(() => vi.clearAllMocks());

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

test("ok result → 200", async () => {
  mockSubmit.mockResolvedValue({ ok: true });
  const res = await POST(req({ email: "ada@example.com" }));
  expect(res.status).toBe(200);
  await expect(res.json()).resolves.toEqual({ ok: true });
});

test("validation failure → 400", async () => {
  mockSubmit.mockResolvedValue({ ok: false, error: "Please add a valid email address." });
  const res = await POST(req({ email: "nope" }));
  expect(res.status).toBe(400);
});

test("thrown error → 500 with gentle copy", async () => {
  mockSubmit.mockRejectedValue(new Error("db down"));
  const res = await POST(req({ email: "ada@example.com" }));
  expect(res.status).toBe(500);
  const body = await res.json();
  expect(body.error).toMatch(/try again in a moment/);
});

test("malformed JSON → 400 without calling submit", async () => {
  const bad = new NextRequest("http://localhost/api/waitlist", {
    method: "POST",
    body: "{not json",
    headers: { "content-type": "application/json" },
  });
  const res = await POST(bad);
  expect(res.status).toBe(400);
  expect(mockSubmit).not.toHaveBeenCalled();
});
```

Run: `npx vitest run tests/waitlist/route.test.ts` — Expected: PASS.

- [ ] **Step 6.9: DB-backed persistence test** — append to `tests/waitlist/waitlist.test.ts` (runs in CI):

```ts
import { vi } from "vitest";
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
import { sendEmail } from "@/lib/email";
import { submitWaitlistSignup } from "@/lib/waitlist";
import { getPayloadClient } from "@/lib/payload";

test("signup persists the row and sends one thank-you; duplicate is a quiet success", async () => {
  const email = `waitlist-${Date.now()}@example.com`;
  const first = await submitWaitlistSignup({ email });
  expect(first).toEqual({ ok: true });

  const payload = await getPayloadClient();
  const rows = await payload.find({
    collection: "waitlist",
    where: { email: { equals: email } },
    overrideAccess: true,
  });
  expect(rows.totalDocs).toBe(1);
  expect(sendEmail).toHaveBeenCalledTimes(1);

  const second = await submitWaitlistSignup({ email });
  expect(second).toEqual({ ok: true });
  const after = await payload.find({
    collection: "waitlist",
    where: { email: { equals: email } },
    overrideAccess: true,
  });
  expect(after.totalDocs).toBe(1);
  expect(sendEmail).toHaveBeenCalledTimes(1); // no second email

  await payload.delete({ collection: "waitlist", id: rows.docs[0].id, overrideAccess: true });
});
```

NOTE: the `vi.mock` must be hoisted to the top of the file with the other imports — restructure the file so `vi.mock("@/lib/email", ...)` appears before any import of `@/lib/waitlist`.

- [ ] **Step 6.10: Rewire the form** — replace `components/series/waitlist-form.tsx` entirely:

```tsx
"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setErrorMessage(
          data.error ?? "We couldn't add you to the list just now. Please try again in a moment.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("We couldn't reach our server. Please try again in a moment.");
    }
  }

  if (status === "sent") {
    return (
      <p
        role="status"
        className="rounded-2xl border-[3px] border-brand-deep bg-white px-6 py-5 text-base font-bold text-brand-deep shadow-comic"
      >
        You are on the list. We will write the moment it is ready.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Honeypot — hidden from real users, catches bots. */}
      <div aria-hidden className="absolute left-[-9999px]">
        <label htmlFor="series-company">Company</label>
        <input
          id="series-company"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="series-email" className="sr-only">
          Email address
        </label>
        <input
          id="series-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-describedby={status === "error" ? "series-waitlist-error" : undefined}
          className="w-full rounded-xl border-[3px] border-brand-deep bg-white px-5 py-4 text-base font-semibold text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-4 focus:ring-brand-pink/40"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="shrink-0 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm disabled:opacity-50"
        >
          {status === "loading" ? "Adding you" : "Notify me"}
        </button>
      </div>

      {status === "error" && (
        <p
          id="series-waitlist-error"
          role="alert"
          className="text-sm font-semibold text-brand-pink"
        >
          {errorMessage}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 6.11: Migration** — create `migrations/20260610_000000_waitlist.ts` following the idempotent pattern of `migrations/20260605_000000_order_customer_notes.ts`:

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the table backing the new `waitlist` collection (Series waitlist
 * signups). Columns mirror Payload's drizzle output for a uuid-PK collection
 * with a unique email field and timestamps. Idempotent (IF NOT EXISTS) so it
 * is safe against a dev-pushed schema.
 *
 * VERIFY before merging: with a dev DB available, run
 * `npm run migrate:create -- waitlist` and diff the generated SQL against this
 * file; Payload's drizzle naming must win if they differ.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "waitlist" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "email" varchar NOT NULL,
      "source" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_idx"
      ON "waitlist" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "waitlist_updated_at_idx"
      ON "waitlist" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "waitlist_created_at_idx"
      ON "waitlist" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "waitlist";
  `);
}
```

Register it in `migrations/index.ts` following the existing entries' exact style (import the module, append `{ up, down, name: "20260610_000000_waitlist" }` to the exported `migrations` array).

- [ ] **Step 6.12: Layer-A e2e** — create `e2e/waitlist.spec.ts` (mirrors `e2e/contact.spec.ts`'s mocking style):

```ts
import { test, expect } from "@playwright/test";

test.describe("@layerA series waitlist", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signup posts the email and shows the on-the-list note", async ({ page }) => {
    let posted: unknown = null;
    await page.route("**/api/waitlist", async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ json: { ok: true } });
    });

    await page.goto("/series");
    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByRole("button", { name: "Notify me" }).click();

    await expect(page.getByRole("status")).toContainText("You are on the list");
    expect(posted).toMatchObject({ email: "ada@example.com" });
  });

  test("server failure shows a gentle error", async ({ page }) => {
    await page.route("**/api/waitlist", (route) =>
      route.fulfill({ status: 500, json: { ok: false, error: "We couldn't add you to the list just now. Please try again in a moment." } }),
    );
    await page.goto("/series");
    await page.getByLabel("Email address").fill("ada@example.com");
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByRole("alert")).toContainText("try again in a moment");
  });
});
```

- [ ] **Step 6.13: Verify + commit**

```bash
npx tsc --noEmit
npx vitest run tests/waitlist/route.test.ts   # pure parts pass locally; DB part in CI
git add collections/Waitlist.ts lib/waitlist.ts app/api/waitlist/route.ts \
  components/series/waitlist-form.tsx payload.config.ts \
  migrations/20260610_000000_waitlist.ts migrations/index.ts \
  tests/waitlist/ e2e/waitlist.spec.ts
git commit -m "feat(series): waitlist signups persist to Payload and send a Resend thank-you"
```

---

### Task 7: Vercel Blob storage + gated video delivery from Blob

**Files:**
- Modify: `payload.config.ts` (plugins), `collections/Media.ts` (comment), `lib/video-access.ts`, `app/(app)/api/orders/[id]/video/route.ts`, `package.json`

- [ ] **Step 7.1: Add the explicit dependency**

Run: `npm install @vercel/blob`
Expected: added to `dependencies` (it is already a transitive dep of the storage plugin; pinning it makes the video route's import explicit).

- [ ] **Step 7.2: Wire the plugin** — in `payload.config.ts`, add `import { vercelBlobStorage } from "@payloadcms/storage-vercel-blob";` and a `plugins` key to `buildConfig`:

```ts
  plugins: [
    // Media storage. Pass-through mode (disablePayloadAccessControl NOT set):
    // file URLs stay on Payload's /api/media/file/* endpoint, so the
    // collection's `read: adminOnly` keeps gating every byte; Payload streams
    // from Blob behind the scenes. Customer-facing delivery goes through the
    // ownership-checked video route, which proxies from Blob directly.
    // In dev with no token the plugin is disabled and local-disk staticDir
    // (collections/Media.ts) still applies.
    vercelBlobStorage({
      enabled: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      collections: { media: true },
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }),
  ],
```

- [ ] **Step 7.3: Update the stale comment in `collections/Media.ts`** — replace the doc-comment lines 11-19 with:

```ts
/**
 * Upload collection for customer-submitted photos and delivered videos.
 *
 * Storage: Vercel Blob in any env where BLOB_READ_WRITE_TOKEN is set (see the
 * vercelBlobStorage plugin in payload.config.ts — pass-through mode, so the
 * adminOnly read rule below still gates the file URLs). Local-disk staticDir
 * is the no-token dev fallback only.
 *
 * Access is staff-only; customers receive bytes ONLY via the ownership-gated
 * route app/(app)/api/orders/[id]/video/route.ts.
 */
```

- [ ] **Step 7.4: Add the Blob branch to video access** — in `lib/video-access.ts`, export a flag near `MEDIA_STATIC_DIR`:

```ts
/** True when media is stored in Vercel Blob (token present) instead of local disk. */
export function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}
```

- [ ] **Step 7.5: Proxy from Blob in the route** — in `app/(app)/api/orders/[id]/video/route.ts`, import `isBlobStorageEnabled` alongside the existing imports, and insert this block AFTER the `disposition` computation (line ~66) and BEFORE the local-disk `stat` logic (move the `stat` call below it; the local path becomes the `else` of this branch):

```ts
  if (isBlobStorageEnabled()) {
    // Blob mode: resolve the stored file by pathname (== filename: no prefix,
    // no random suffix configured) and proxy the bytes. The Blob URL never
    // reaches the client — ownership stays the only door. Range is forwarded
    // so <video> seeking works.
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blobUrl: string;
    try {
      const blob = await head(video.filename);
      blobUrl = blob.url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return new Response("This video is not ready yet.", { status: 404 });
      }
      throw err;
    }

    const range = request.headers.get("range");
    const upstream = await fetch(blobUrl, {
      headers: range ? { range } : undefined,
    });
    if (upstream.status !== 200 && upstream.status !== 206) {
      return new Response("This video is not ready yet.", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": video.mimeType,
      "Content-Disposition": disposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0, no-store",
    });
    for (const h of ["content-length", "content-range"] as const) {
      const value = upstream.headers.get(h);
      if (value) headers.set(h, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  }
```

Note: `disposition` and the `download` flag are currently computed after the `stat` block — reorder so `download`/`disposition` are computed right after the `mediaFilePath`/null checks, then the Blob branch, then the existing local-disk logic unchanged. `mediaFilePath` stays used only by the local-disk path.

- [ ] **Step 7.6: Typecheck + existing tests**

Run: `npx tsc --noEmit && npx vitest run tests/app/video-access.test.ts` (DB-backed part in CI)
Expected: PASS — `resolveOwnedVideo` and the ownership gate are untouched.

- [ ] **Step 7.7: Deploy-time verification (record in PR description, not automatable here):** on a Vercel preview with a Blob store attached — upload a small mp4 to an order's `finalVideo` via `/admin`, confirm (a) the file lands in Blob, (b) the owner can play and scrub it at `/app/orders/<id>`, (c) a signed-out request to `/api/orders/<id>/video` gets 403, (d) `head()` resolves the filename (if it does not, set a `prefix` in the plugin config and join it in the route's `head()` call).

- [ ] **Step 7.8: Commit**

```bash
git add payload.config.ts collections/Media.ts lib/video-access.ts \
  "app/(app)/api/orders/[id]/video/route.ts" package.json package-lock.json
git commit -m "feat(media): Vercel Blob storage in pass-through mode; gated video route proxies from Blob"
```

---

### Task 8: Photo uploads that survive Vercel's request limits

**Why:** photos are capped at 15 MB (`lib/order-upload-validation.ts:12`) but Next server actions default to ~1 MB bodies and Vercel hard-caps requests at ~4.5 MB — most phone photos would fail in production today.

**Files:**
- Modify: `lib/order-upload-validation.ts`, `components/app/photo-upload.tsx`, `next.config.ts`
- Create: `components/app/prepare-upload.ts`
- Test: `tests/app/order-actions.test.ts` already covers `validateUploadFile`; the new constant gets asserted there.

- [ ] **Step 8.1: Add the per-request constant** — in `lib/order-upload-validation.ts` after `MAX_UPLOAD_BYTES`:

```ts
/**
 * Max bytes per upload REQUEST. Vercel rejects request bodies over ~4.5 MB,
 * and each photo travels in its own server-action call (see photo-upload.tsx),
 * so every file must fit under this after client-side re-encoding. Kept below
 * the platform cap to leave room for multipart overhead.
 */
export const MAX_REQUEST_BYTES = 3.5 * 1024 * 1024; // 3.5 MB
```

- [ ] **Step 8.2: Create `components/app/prepare-upload.ts`** (client-only canvas re-encoder):

```ts
/**
 * Client-side photo shrinking so each upload request fits under Vercel's
 * ~4.5 MB body cap (see MAX_REQUEST_BYTES). Browser-only: uses canvas.
 *
 * Photos are likeness reference for the studio, not print assets — 2048px
 * JPEG is plenty. Files already small enough pass through untouched. Files
 * the browser cannot decode (some HEICs outside Safari) that are also over
 * the cap get a gentle, actionable error.
 */
import { MAX_REQUEST_BYTES } from "@/lib/order-upload-validation";

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

export type PreparedUpload = { ok: true; file: File } | { ok: false; error: string };

export async function prepareForUpload(file: File): Promise<PreparedUpload> {
  if (file.size <= MAX_REQUEST_BYTES) return { ok: true, file };

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (blob && blob.size <= MAX_REQUEST_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return { ok: true, file: new File([blob], name, { type: "image/jpeg" }) };
    }
  } catch {
    // fall through to the gentle error below
  }

  return {
    ok: false,
    error: `"${file.name}" is a little large to send. Please choose a version under 4 MB, or a JPEG copy.`,
  };
}
```

- [ ] **Step 8.3: Send one photo per action call** — in `components/app/photo-upload.tsx`, import `prepareForUpload` and replace the body of `onSubmit`'s `startTransition` callback:

```ts
    startTransition(async () => {
      let added = 0;
      for (const file of files) {
        const prepared = await prepareForUpload(file);
        if (!prepared.ok) {
          setError(prepared.error);
          return;
        }
        // One file per request keeps every call under the platform body cap.
        const formData = new FormData();
        formData.append("files", prepared.file);
        const result = await uploadOrderAssets(orderId, formData);
        if (result.error) {
          setError(
            added > 0
              ? `We saved ${added} photo${added === 1 ? "" : "s"}, then hit a snag. ${result.error}`
              : result.error,
          );
          return;
        }
        added += result.added;
      }
      setDone(added);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    });
```

- [ ] **Step 8.4: Raise the server-action body limit** — in `next.config.ts`, using the exact config shape confirmed in Step 0.2 (shown here in its historical location):

```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Photos travel one-per-request from the order page (see
  // components/app/photo-upload.tsx); 5mb leaves headroom over
  // MAX_REQUEST_BYTES + multipart overhead. Vercel's ~4.5MB platform cap is
  // the real ceiling.
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
```

- [ ] **Step 8.5: Verify**

Run: `npx tsc --noEmit && npx vitest run tests/app/order-stages.test.ts` (pure) — Expected: PASS. Manual/preview check recorded for the PR: upload an ~8 MB phone photo on `/app/orders/<id>` → it re-encodes and succeeds.

- [ ] **Step 8.6: Commit**

```bash
git add lib/order-upload-validation.ts components/app/prepare-upload.ts \
  components/app/photo-upload.tsx next.config.ts
git commit -m "fix(app): photo uploads re-encode client-side and ship one-per-request to fit Vercel body limits"
```

---

### Task 9: Onboarding docs + CI typecheck

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`, `README.md`, `CLAUDE.md`, `components/checkout/README.md:17`, `.github/workflows/test.yml`
- Delete: `tests/smoke.test.ts` (asserts `1+1=2`; the real suites make it noise)

- [ ] **Step 9.1: Un-ignore the example file** — in `.gitignore`, directly under the `.env*` line add:

```
!.env.example
```

- [ ] **Step 9.2: Create `.env.example`**

```bash
# ── Database ────────────────────────────────────────────────────────────────
# Local/dev/test connection string. On Vercel the Neon integration provides
# POSTGRES_URL instead (payload.config.ts falls back to it in prod).
DATABASE_URI=postgresql://user:password@localhost:5432/yours_fairy_tale

# ── Payload CMS ─────────────────────────────────────────────────────────────
# Signing secret for Payload admin JWTs. Generate: openssl rand -base64 32
PAYLOAD_SECRET=

# ── Better Auth (customer magic-link sign-in) ───────────────────────────────
# Generate: openssl rand -base64 32
BETTER_AUTH_SECRET=
# Canonical site origin, e.g. https://www.yoursfairytale.com (REQUIRED in prod)
BETTER_AUTH_URL=

# ── Site ────────────────────────────────────────────────────────────────────
# Public origin used for Stripe success/cancel URLs and email CTAs.
# Dev: http://localhost:1234 (REQUIRED in prod)
NEXT_PUBLIC_APP_URL=http://localhost:1234

# ── Stripe ──────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
# From the Stripe webhook endpoint (or `stripe listen` locally)
STRIPE_WEBHOOK_SECRET=

# ── Email (Resend) ──────────────────────────────────────────────────────────
RESEND_API_KEY=
# Verified sender, e.g. "Yours Fairy Tale <hello@yoursfairytale.com>"
RESEND_FROM=
# Dev only: redirect ALL outgoing mail to this address
RESEND_TO_OVERRIDE=
# Inbox for /contact submissions (defaults to hello@yoursfairytale.com)
CONTACT_INBOX=

# ── Storage (Vercel Blob) ───────────────────────────────────────────────────
# Set automatically by Vercel when a Blob store is attached. Unset locally →
# media falls back to local-disk ./media.
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 9.3: Rewrite `README.md`** — replace the create-next-app boilerplate entirely:

```markdown
# Yours Fairy Tale

Personalized animated fairy-tale videos starring a customer's child. The
parent shares a few photos and details; we deliver a short cinematic film
with their child as the hero. The parent is the buyer, the child is the hero.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Payload CMS v3 on
Postgres/Neon · Better Auth (magic-link customer sign-in) · Stripe Checkout ·
Resend · Vercel (deploy + Blob storage).

## Getting started

1. `npm ci`
2. `cp .env.example .env` and fill it in (see the comments in that file)
3. `npm run dev` → http://localhost:1234

The Payload admin lives at `/admin` (staff accounts in the `admins`
collection). Customer accounts are created ONLY by the Stripe webhook after a
purchase; customers sign in at `/sign-in` with a magic link.

## Tests

- `npm test` — vitest, DB-backed against the database in `.env.test`
  (falls back to `.env`)
- `npm run test:e2e` — Playwright Layers A (mocked) + B (DB-seeded)
- `npm run test:e2e:smoke` — Layer C, real Stripe test-mode purchase;
  requires `stripe listen --forward-to localhost:3100/api/stripe/webhook`

## Where everything is explained

This repo has a knowledge base at `fairy-tale-mind/` (the Mind): zone cards
mapping every area of the code, decision records, and an honest tech-debt
register. Start at `fairy-tale-mind/map/product.md`, then
`fairy-tale-mind/map/index.md`. Conventions (design tokens, brand voice,
section waves) live in `CLAUDE.md` and `.claude/skills/`.

## Deploying

Production deploys run DB migrations automatically on boot
(`instrumentation.ts`) and fail closed if any required env var from
`.env.example` is missing in the Vercel project settings.
```

- [ ] **Step 9.4: Fix the CLAUDE.md product description** — replace the paragraph under `# Yours Fairy Tale` ("Personalized, hand-illustrated hardcover storybooks…") with:

```markdown
Personalized animated fairy-tale videos starring a customer's child. Parents
share a few photos and light details (name, favorite animal, a plot idea) and
receive a short, cinematic film with their child as the hero — a keepsake to
watch again and again.
```

- [ ] **Step 9.5: Fix the checkout README example** — in `components/checkout/README.md:17`, change `{ label: "Hardcover", amount: 49 }` to `{ label: "Personalized video", amount: 49 }`.

- [ ] **Step 9.6: CI typecheck + honest comment** — in `.github/workflows/test.yml`: change the first comment line to `# CI — typecheck, vitest, and Playwright Layer A & B on every PR and main push.` and add after the "Install dependencies" step:

```yaml
      - name: Typecheck
        run: npx tsc --noEmit
```

(If Step 0.2 found `next typegen` is required for route types, make the run line `npx next typegen && npx tsc --noEmit`.)

- [ ] **Step 9.7: Remove the tautology test**

```bash
git rm tests/smoke.test.ts
```

- [ ] **Step 9.8: Verify + commit**

```bash
npx tsc --noEmit
git add .env.example .gitignore README.md CLAUDE.md components/checkout/README.md .github/workflows/test.yml
git commit -m "docs: real README + .env.example; CLAUDE.md says videos; CI gains a typecheck step"
```

---

### Task 10: Mind maintenance (same change-set as the code)

**Files:** `fairy-tale-mind/map/zones/{series,checkout,auth-gating,payload-backend,app-shell,testing}.md`, `fairy-tale-mind/map/decisions/`, `fairy-tale-mind/tech-debt/`, regenerated `fairy-tale-mind/map/index.md`

- [ ] **Step 10.1: Update touched zone cards** — for each zone, refresh the affected `owns`/`invariants`/essence lines and re-stamp `verifiedAt` to HEAD:
  - `series`: waitlist is now real (collection + route + email); invariant: "the waitlist form never fakes success — every signup persists via /api/waitlist".
  - `checkout`: webhook out-of-order events throw for retry; note the new invariant.
  - `auth-gating`: magic-link send failures surface to the user; trustedOrigins carries no wildcards.
  - `payload-backend`: Waitlist collection; vercelBlobStorage plugin (pass-through mode).
  - `app-shell`: footer socials are real external links.
  - `testing`: new waitlist tests, webhook orphan tests, CI typecheck step.

- [ ] **Step 10.2: Add decision records** (PAST tense, one file each, follow existing frontmatter):
  - `waitlist-signups-payload-plus-resend.md` — why a Payload collection (queryable in /admin, same access pattern as Orders) + non-fatal thank-you email; duplicate = quiet success (no enumeration, no double mail).
  - `blob-pass-through-proxied-video.md` — why pass-through mode + ownership-gated proxy instead of public Blob URLs or signed URLs (MVP: gate stays in one place; private-Blob signed URLs remain the post-MVP end state).
  - `webhook-orphan-events-retry.md` — why throw-for-retry beats persist-and-reconcile at this scale.
  - `prod-env-fail-closed.md` — why boot throws on missing env (silent half-working deploys are worse than a loud 500).

- [ ] **Step 10.3: Tech-debt bookkeeping**:
  - Close (status: resolved + resolution note): `footer-dead-links`, `claude-md-says-hardcover`, `checkout-readme-stale`, `better-auth-url-unset` (now required + documented).
  - Update `local-disk-video-delivery`: superseded in scope — delivery now proxies from Blob; remaining debt is "private Blob / signed playback URLs post-MVP".
  - Add `heic-photos-over-cap-rejected.md` (low): browsers that cannot decode HEIC reject >3.5 MB HEIC files with a gentle error instead of converting them.
  - Leave open: `studio-not-notified-of-customer-notes`, `dotfield-hydration-mismatch`, `existing-mixedcase-emails-migration`, `stale-order-enum-rows-block-dev-push`, `manual-vercel-deploy-breaks-mind-verifier`, and `better-auth-kysely-build-break` **unless** Step 0.3/0.4's build evidence resolves it — if `next build` succeeds during e2e or locally, close it with that evidence.

- [ ] **Step 10.4: Regenerate the index**

Run: `npm run mind`
Expected: index regenerated; zone count 15→15, debt count drops by ≥4; no NEW verification gaps introduced by edited cards.

- [ ] **Step 10.5: Final verification + commit**

```bash
npx tsc --noEmit
npx vitest run tests/lib/pricing.test.ts tests/contact/route.test.ts \
  tests/waitlist/route.test.ts tests/lib/required-env.test.ts tests/auth/server.test.ts
git add fairy-tale-mind/
git commit -m "docs(mind): launch-hardening — zone re-stamps, 4 decisions, debt closures"
```

---

## Final acceptance (the whole plan is "done" when)

1. CI is green: typecheck + full vitest (incl. new waitlist/orphan-event/cap tests) + Playwright A/B (incl. the new waitlist spec).
2. On a Vercel preview with Blob attached: photo upload (large phone photo), admin video upload, owner playback with scrubbing, 403 for non-owners — all verified by hand (Task 7.7/8.5 notes in the PR).
3. A waitlist signup on `/series` produces a row in `/admin` and a thank-you email (RESEND_TO_OVERRIDE inbox).
4. `git grep -n 'href="#"' components/ app/ --and --not -e legacy` returns nothing in live code.
5. The Mind index shows the closed debt and freshly stamped zones.
