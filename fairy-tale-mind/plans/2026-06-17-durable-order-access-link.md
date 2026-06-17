# Durable Order-Access Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Order-status emails ("preview ready" / "delivered") and the order-confirmation "track your order" link become a durable, reusable `/open/<token>` link that signs the customer in instantly (no confirm step) and works for 30 days, instead of a single-use 7-day magic-link token behind a confirm interstitial.

**Architecture:** Each order carries a long random `accessToken` (+ `accessTokenExpiresAt`), refreshed to now+30d on every status email. A public `/open/[token]` route handler resolves the order, mints a fresh SHORT-LIVED internal Better Auth magic-link verification for the owner, calls `auth.api.magicLinkVerify({asResponse:true})` server-side, and returns that `Response` (session cookie + 302 to the order). The durable token is never consumed, so the link is reusable. Expired/unknown tokens redirect to a calm `/open/expired` page. This reuses Better Auth's real verify→session flow (the exact path `createOrderTrackingLink` used and that `tests/auth/order-tracking-link.test.ts` proved), which this change supersedes.

**Tech Stack:** Next.js 16 route handlers, Better Auth (`auth.api.magicLinkVerify`), Payload v3 on Postgres/Neon, Vitest (node env).

**Source spec:** `fairy-tale-mind/specs/2026-06-17-durable-order-access-link-design.md`

**Security note (accepted by the brand owner):** a reusable emailed link grants a full session to anyone holding the link for up to 30 days (forwarded email or a link-prefetcher that completes the redirect + keeps cookies). Blast radius = the customer's own keepsake orders + profile (no payment/PII editing). Documented in the decision record; a one-tap "Open my preview" button (to block passive prefetch) is noted as a future option, NOT built here.

---

## File Structure

**Create:**
- `lib/order-access-token.ts` — pure token/TTL helpers (`newAccessToken`, `ACCESS_TOKEN_TTL_DAYS`, `accessTokenExpiresAt`, `isAccessTokenLive`). No DB.
- `lib/order-access.ts` — DB cores: `ensureOrderAccessToken`, `resolveOrderByAccessToken`, `mintEphemeralSignin`.
- `app/(site)/(app)/open/[token]/route.ts` — public GET route: token → session → order.
- `app/(site)/(app)/open/expired/page.tsx` — the calm expired page.
- `tests/lib/order-access-token.test.ts`, `tests/auth/order-access.test.ts` — tests.

**Modify:**
- `collections/Orders.ts` — add `accessToken` + `accessTokenExpiresAt`.
- `migrations/index.ts` + new migration.
- `lib/order-status-email.ts` — link via `ensureOrderAccessToken` → `/open/<token>`.
- `app/api/stripe/webhook/route.ts` — "track your order" link via the durable link.
- `tests/app/status-emails.test.ts`, `tests/app/status-email-link.test.ts` — re-point the mock from `order-tracking-link` to `order-access`.

**Delete (superseded):**
- `lib/order-tracking-link.ts` + `tests/auth/order-tracking-link.test.ts` (only callers are the two email builders, both switched here).

**Test command:** `npm test` (= `vitest run`). Single file: `npx vitest run <path>`.

---

## Task 1: `lib/order-access-token.ts` — pure token + TTL helpers (TDD)

**Files:** Create `tests/lib/order-access-token.test.ts`, `lib/order-access-token.ts`.

- [ ] **Step 1: Write the failing test** — `tests/lib/order-access-token.test.ts`:

```ts
/**
 * order-access-token — pure token shape + 30-day TTL math for the durable
 * reusable order-access link. No DB.
 */
import { describe, expect, test } from "vitest";

import {
  newAccessToken,
  ACCESS_TOKEN_TTL_DAYS,
  accessTokenExpiresAt,
  isAccessTokenLive,
} from "@/lib/order-access-token";

describe("newAccessToken", () => {
  test("is 32 chars of [a-zA-Z]", () => {
    const t = newAccessToken();
    expect(t).toMatch(/^[a-zA-Z]{32}$/);
  });
  test("is non-repeating across calls", () => {
    expect(newAccessToken()).not.toBe(newAccessToken());
  });
});

describe("ttl", () => {
  test("ACCESS_TOKEN_TTL_DAYS is 30", () => {
    expect(ACCESS_TOKEN_TTL_DAYS).toBe(30);
  });
  test("accessTokenExpiresAt is now + 30 days, ISO", () => {
    const now = new Date("2026-06-17T00:00:00.000Z");
    expect(accessTokenExpiresAt(now)).toBe("2026-07-17T00:00:00.000Z");
  });
});

describe("isAccessTokenLive", () => {
  const now = new Date("2026-06-17T12:00:00.000Z");
  test("future expiry → live", () => {
    expect(isAccessTokenLive("2026-07-01T00:00:00.000Z", now)).toBe(true);
  });
  test("past expiry → not live", () => {
    expect(isAccessTokenLive("2026-06-01T00:00:00.000Z", now)).toBe(false);
  });
  test("null / unparseable → not live", () => {
    expect(isAccessTokenLive(null, now)).toBe(false);
    expect(isAccessTokenLive("nope", now)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `npx vitest run tests/lib/order-access-token.test.ts` → FAIL (cannot resolve module).

- [ ] **Step 3: Implement** — `lib/order-access-token.ts`:

```ts
/**
 * order-access-token — the durable, REUSABLE order-access link's token shape and
 * 30-day TTL, as pure data (no DB). The token is stored on the order and emailed
 * in /open/<token>; isAccessTokenLive gates the route. Unit-tested in
 * tests/lib/order-access-token.test.ts.
 */
import { randomBytes } from "node:crypto";

export const ACCESS_TOKEN_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** 32 chars from [a-zA-Z] — the same shape Better Auth magic-link tokens use. */
export function newAccessToken(length = 32): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TOKEN_ALPHABET[bytes[i]! % TOKEN_ALPHABET.length];
  }
  return out;
}

/** ISO timestamp 30 days from `now`. */
export function accessTokenExpiresAt(now: Date): string {
  return new Date(now.getTime() + ACCESS_TOKEN_TTL_DAYS * DAY_MS).toISOString();
}

/** Is a stored expiry still in the future? null/unparseable → false. */
export function isAccessTokenLive(expiresAt: string | null, now: Date): boolean {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !Number.isNaN(t) && t > now.getTime();
}
```

- [ ] **Step 4: Run it, confirm PASS** — `npx vitest run tests/lib/order-access-token.test.ts`.
- [ ] **Step 5: tsc** — `npx tsc --noEmit`.
- [ ] **Step 6: Commit** — `git add lib/order-access-token.ts tests/lib/order-access-token.test.ts && git commit -m "feat(lib): order-access-token pure helpers (32-char token + 30-day TTL, TDD)"`

---

## Task 2: Orders `accessToken` fields + migration

**Files:** Modify `collections/Orders.ts`, `migrations/index.ts`; create `migrations/20260617_000000_orders_access_token.ts`.

- [ ] **Step 1: Add the fields** — in `collections/Orders.ts`, immediately AFTER the `inStudioSince` field object and before the closing `],` of `fields`, insert:

```ts
    {
      name: "accessToken",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description:
          "Durable, reusable token for the order's email links (/open/<token>). " +
          "Signs the customer in and lands them on this order; refreshed to 30 " +
          "days on every status email. System-managed; never shown in the UI.",
      },
    },
    {
      name: "accessTokenExpiresAt",
      type: "date",
      admin: { readOnly: true },
    },
```

- [ ] **Step 2: Create the migration** — `migrations/20260617_000000_orders_access_token.ts`:

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds orders.access_token (text) + orders.access_token_expires_at (timestamptz)
 * + a btree index on access_token: the durable, reusable order-access link
 * (/open/<token>). Additive and idempotent; safe against a dev-pushed schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_token" text;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "orders_access_token_idx" ON "orders" USING btree ("access_token");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "orders_access_token_idx";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "access_token_expires_at";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "access_token";
  `);
}
```

- [ ] **Step 3: Register it** — in `migrations/index.ts`, add the import after the last existing import:

```ts
import * as migration_20260617_000000_orders_access_token from "./20260617_000000_orders_access_token";
```

and append as the LAST entry of the `migrations` array:

```ts
  {
    up: migration_20260617_000000_orders_access_token.up,
    down: migration_20260617_000000_orders_access_token.down,
    name: "20260617_000000_orders_access_token",
  },
```

- [ ] **Step 4: tsc** — `npx tsc --noEmit` → clean.
- [ ] **Step 5: Commit** — `git add collections/Orders.ts migrations/20260617_000000_orders_access_token.ts migrations/index.ts && git commit -m "feat(orders): accessToken + accessTokenExpiresAt fields + migration"`

> Do NOT run the migration by hand; prod applies it via migrate-on-boot, dev/test via schema-push.

---

## Task 3: `lib/order-access.ts` — DB cores (TDD)

**Files:** Create `tests/auth/order-access.test.ts`, `lib/order-access.ts`.

- [ ] **Step 1: Write the failing test** — `tests/auth/order-access.test.ts`:

```ts
/**
 * order-access — DB cores for the durable reusable order link. DB-backed
 * (boots Payload against the Neon test branch).
 *   - ensureOrderAccessToken mints once, then only refreshes expiry (token stable).
 *   - resolveOrderByAccessToken returns the order+owner for a live token, null for
 *     expired / unknown.
 *   - mintEphemeralSignin mints a verification Better Auth's real verify accepts.
 */
import { afterAll, describe, expect, test } from "vitest";

import { getPayloadClient } from "@/lib/payload";
import { auth } from "@/lib/auth";
import {
  ensureOrderAccessToken,
  resolveOrderByAccessToken,
  mintEphemeralSignin,
} from "@/lib/order-access";

const created: { collection: "users" | "orders"; id: string }[] = [];

async function seedOrder(email: string) {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: { email, emailVerified: true } as never,
    overrideAccess: true,
  });
  created.push({ collection: "users", id: String(user.id) });
  const order = await payload.create({
    collection: "orders",
    data: { owner: user.id, status: "in_production", childName: "Test 1" },
    overrideAccess: true,
  });
  created.push({ collection: "orders", id: String(order.id) });
  return { payload, order, user };
}

afterAll(async () => {
  const payload = await getPayloadClient();
  for (const d of created.reverse()) {
    await payload.delete({ collection: d.collection, id: d.id, overrideAccess: true }).catch(() => {});
  }
});

describe("ensureOrderAccessToken", () => {
  test("mints once, then refreshes expiry but keeps the token", async () => {
    const { payload, order } = await seedOrder(`oa-${Date.now()}-a@example.com`);
    const token1 = await ensureOrderAccessToken(String(order.id));
    expect(token1).toMatch(/^[a-zA-Z]{32}$/);
    const after1 = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    const exp1 = after1.accessTokenExpiresAt as string;

    await new Promise((r) => setTimeout(r, 10));
    const token2 = await ensureOrderAccessToken(String(order.id));
    expect(token2).toBe(token1); // token stable
    const after2 = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    expect(new Date(after2.accessTokenExpiresAt as string).getTime()).toBeGreaterThan(
      new Date(exp1).getTime(),
    ); // expiry refreshed
  });
});

describe("resolveOrderByAccessToken", () => {
  test("live token → { orderId, ownerEmail }", async () => {
    const email = `oa-${Date.now()}-b@example.com`;
    const { order } = await seedOrder(email);
    const token = await ensureOrderAccessToken(String(order.id));
    const resolved = await resolveOrderByAccessToken(token, new Date());
    expect(resolved).toEqual({ orderId: String(order.id), ownerEmail: email });
  });

  test("unknown token → null", async () => {
    expect(await resolveOrderByAccessToken("z".repeat(32), new Date())).toBeNull();
  });

  test("expired token → null", async () => {
    const { payload, order } = await seedOrder(`oa-${Date.now()}-c@example.com`);
    const token = await ensureOrderAccessToken(String(order.id));
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { accessTokenExpiresAt: "2020-01-01T00:00:00.000Z" },
      overrideAccess: true,
    });
    expect(await resolveOrderByAccessToken(token, new Date())).toBeNull();
  });
});

describe("mintEphemeralSignin", () => {
  test("mints a verification Better Auth's real verify accepts", async () => {
    const email = `oa-${Date.now()}-d@example.com`;
    await seedOrder(email);
    const token = await mintEphemeralSignin(email);
    const res: Response = await auth.api.magicLinkVerify({
      query: { token, callbackURL: "/app" },
      headers: { origin: "http://localhost:3000" },
      asResponse: true,
    });
    expect(res.headers.get("location") ?? "").not.toContain("error=");
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `npx vitest run tests/auth/order-access.test.ts` → FAIL (cannot resolve `@/lib/order-access`).

- [ ] **Step 3: Implement** — `lib/order-access.ts`:

```ts
/**
 * order-access — DB cores for the durable, reusable order-access link
 * (/open/<token>). The durable token lives on the order and is never consumed;
 * each visit re-mints a SHORT-LIVED internal Better Auth magic-link verification
 * (the exact shape BA's verify consumes) so we reuse BA's real verify→session
 * flow instead of hand-rolling sessions. Tested in tests/auth/order-access.test.ts.
 */
import { getPayloadClient } from "@/lib/payload";
import {
  newAccessToken,
  accessTokenExpiresAt,
  isAccessTokenLive,
} from "@/lib/order-access-token";

const EPHEMERAL_TTL_MS = 10 * 60 * 1000; // 10 minutes — minted and used in one request

/** Mint (once) or refresh (always) the order's durable access token; returns it. */
export async function ensureOrderAccessToken(orderId: string): Promise<string> {
  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });
  const token =
    typeof order.accessToken === "string" && order.accessToken
      ? order.accessToken
      : newAccessToken();
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { accessToken: token, accessTokenExpiresAt: accessTokenExpiresAt(new Date()) },
    overrideAccess: true,
  });
  return token;
}

/** Resolve a durable token to its order + owner email, or null (unknown/expired). */
export async function resolveOrderByAccessToken(
  token: string,
  now: Date,
): Promise<{ orderId: string; ownerEmail: string } | null> {
  if (!token) return null;
  const payload = await getPayloadClient();
  const found = await payload.find({
    collection: "orders",
    where: { accessToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const order = found.docs[0];
  if (!order) return null;
  if (!isAccessTokenLive((order.accessTokenExpiresAt as string | null) ?? null, now)) {
    return null;
  }
  const ownerId =
    typeof order.owner === "object" && order.owner !== null
      ? String((order.owner as { id: string }).id)
      : order.owner
        ? String(order.owner)
        : null;
  if (!ownerId) return null;
  const owner = await payload.findByID({
    collection: "users",
    id: ownerId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  });
  if (!owner?.email) return null;
  return { orderId: String(order.id), ownerEmail: String(owner.email) };
}

/**
 * Mint a fresh short-lived Better Auth magic-link verification for `email`,
 * returning the token. Same row shape BA's magic-link plugin uses (identifier =
 * raw token, value = JSON {email}, expiresAt). Single-use + 10-min; created and
 * consumed within one /open request.
 */
export async function mintEphemeralSignin(email: string): Promise<string> {
  const token = newAccessToken();
  const payload = await getPayloadClient();
  await payload.create({
    collection: "verifications",
    data: {
      identifier: token,
      value: JSON.stringify({ email }),
      expiresAt: new Date(Date.now() + EPHEMERAL_TTL_MS).toISOString(),
    } as never,
    overrideAccess: true,
  });
  return token;
}
```

- [ ] **Step 4: Run it, confirm PASS** — `npx vitest run tests/auth/order-access.test.ts` (DB-backed; slower).
- [ ] **Step 5: tsc** — `npx tsc --noEmit`.
- [ ] **Step 6: Commit** — `git add lib/order-access.ts tests/auth/order-access.test.ts && git commit -m "feat(auth): order-access DB cores — durable token + ephemeral BA sign-in (TDD)"`

---

## Task 4: `/open/[token]` route + `/open/expired` page

**Files:** Create `app/(site)/(app)/open/[token]/route.ts`, `app/(site)/(app)/open/expired/page.tsx`.

- [ ] **Step 1: The route handler** — `app/(site)/(app)/open/[token]/route.ts`:

```ts
/**
 * /open/<token> — the durable, reusable order-access link target. PUBLIC (a
 * route handler, so the (app) gate never applies; the visitor is signed OUT).
 *
 * A live token re-mints a short-lived internal Better Auth magic-link
 * verification for the order's owner and hands off to BA's real verify endpoint
 * server-side (auth.api.magicLinkVerify, asResponse) — the returned Response
 * carries the session cookie + a 302 to the order, so the customer is signed in
 * instantly and lands on their order with NO confirm interstitial. The durable
 * token is never consumed → the email link is reusable for 30 days.
 *
 * An unknown/expired token redirects to /open/expired (no order id leaked).
 */
import { auth } from "@/lib/auth";
import { resolveOrderByAccessToken, mintEphemeralSignin } from "@/lib/order-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const expired = new URL("/open/expired", req.url);

  let resolved;
  try {
    resolved = await resolveOrderByAccessToken(token, new Date());
  } catch (err) {
    console.error("[open] resolve failed:", err);
    return Response.redirect(expired, 302);
  }
  if (!resolved) return Response.redirect(expired, 302);

  try {
    const ephemeral = await mintEphemeralSignin(resolved.ownerEmail);
    return await auth.api.magicLinkVerify({
      query: { token: ephemeral, callbackURL: `/app/orders/${resolved.orderId}` },
      headers: req.headers,
      asResponse: true,
    });
  } catch (err) {
    console.error("[open] sign-in handoff failed:", err);
    return Response.redirect(expired, 302);
  }
}
```

- [ ] **Step 2: The expired page** — `app/(site)/(app)/open/expired/page.tsx` (self-centering card; copy passed the brand-voice guide — calm, sentence case, no hype):

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Link expired — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default function OpenExpiredPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
        <h1 className="text-3xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          This link has expired
        </h1>
        <p className="mt-3 text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          For your security, order links work for 30 days. Sign in with the email
          you used for your order and we&apos;ll take you right back to it.
        </p>
        <Link
          href="/sign-in"
          className="mt-7 inline-flex rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add a route test** — append to `tests/auth/order-access.test.ts` (the GET handler is directly callable):

```ts
import { GET as openRoute } from "@/app/(site)/(app)/open/[token]/route";

describe("/open/[token] route", () => {
  test("unknown token → 302 to /open/expired", async () => {
    const res = await openRoute(new Request("https://x.test/open/zzz"), {
      params: Promise.resolve({ token: "z".repeat(32) }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location") ?? "").toContain("/open/expired");
  });

  test("live token → a session response (no error redirect)", async () => {
    const email = `oa-${Date.now()}-e@example.com`;
    const { order } = await seedOrder(email);
    const token = await ensureOrderAccessToken(String(order.id));
    const res = await openRoute(new Request("https://x.test/open/" + token, { headers: { origin: "https://x.test" } }), {
      params: Promise.resolve({ token }),
    });
    expect(res.headers.get("location") ?? "").not.toContain("error=");
    expect(res.headers.get("location") ?? "").not.toContain("/open/expired");
  });
});
```

- [ ] **Step 4: Run + tsc** — `npx vitest run tests/auth/order-access.test.ts && npx tsc --noEmit`.
- [ ] **Step 5: Commit** — `git add "app/(site)/(app)/open" tests/auth/order-access.test.ts && git commit -m "feat(app): /open/[token] durable order-access route + expired page"`

---

## Task 5: Point the emails at the durable link

**Files:** Modify `lib/order-status-email.ts`, `app/api/stripe/webhook/route.ts`, `tests/app/status-emails.test.ts`, `tests/app/status-email-link.test.ts`.

- [ ] **Step 1: Status email** — in `lib/order-status-email.ts`, replace the `createOrderTrackingLink` import (line 22) with:

```ts
import { ensureOrderAccessToken } from "@/lib/order-access";
```

and replace the link build (lines 73-77) with:

```ts
    const token = await ensureOrderAccessToken(orderId);
    const href = `${baseUrl}/open/${token}`;
```

- [ ] **Step 2: Webhook confirmation email** — in `app/api/stripe/webhook/route.ts`, replace the `createOrderTrackingLink` import (line 23) with `import { ensureOrderAccessToken } from "@/lib/order-access";`. Then replace the track-link block (lines 328-334):

```ts
  const baseUrl = process.env.BETTER_AUTH_URL ?? "https://www.yoursfairytale.com";
  let trackUrl = `${baseUrl.replace(/\/$/, "")}/sign-in`;
  try {
    trackUrl = await createOrderTrackingLink({ email, baseUrl });
  } catch (err) {
    console.error("[webhook] tracking link mint failed (using /sign-in fallback):", err);
  }
```

with (the order was created just above as `order`):

```ts
  const baseUrl = (process.env.BETTER_AUTH_URL ?? "https://www.yoursfairytale.com").replace(/\/$/, "");
  let trackUrl = `${baseUrl}/sign-in`;
  try {
    trackUrl = `${baseUrl}/open/${await ensureOrderAccessToken(String(order.id))}`;
  } catch (err) {
    console.error("[webhook] access link mint failed (using /sign-in fallback):", err);
  }
```

- [ ] **Step 3: Update the two mocking tests.** In BOTH `tests/app/status-emails.test.ts` and `tests/app/status-email-link.test.ts`, change the `vi.mock("@/lib/order-tracking-link", ...)` block to mock the new module instead:

```ts
vi.mock("@/lib/order-access", () => ({
  ensureOrderAccessToken: vi.fn().mockResolvedValue("tok_test_access_token_32xxxxxxxxxx"),
}));
```

and update the import + any assertion. In `tests/app/status-email-link.test.ts`, the assertion that previously checked `createOrderTrackingLink` was called with `{ callbackURL: "/app/orders/<id>" }` becomes: assert `ensureOrderAccessToken` was called with the order id, and (if the test inspects the rendered html) that the CTA href is `…/open/tok_test_access_token_32xxxxxxxxxx`. Read both test files first and adapt the existing assertions to the new shape — keep what they were proving (the email contains a working order link), just against the new mechanism.

- [ ] **Step 4: Run the affected tests + tsc** — `npx vitest run tests/app/status-emails.test.ts tests/app/status-email-link.test.ts tests/stripe/webhook.test.ts && npx tsc --noEmit`. Expected: green. (If `tests/stripe/webhook.test.ts` asserts anything about the old tracking link, update it to expect `accessToken` set on the order + an `/open/` confirmation link.)

- [ ] **Step 5: Commit** — `git add lib/order-status-email.ts app/api/stripe/webhook/route.ts tests/app/status-emails.test.ts tests/app/status-email-link.test.ts tests/stripe/webhook.test.ts && git commit -m "feat(email): order emails use the durable /open link (instant reusable sign-in)"`

---

## Task 6: Remove the superseded tracking link

**Files:** Delete `lib/order-tracking-link.ts`, `tests/auth/order-tracking-link.test.ts`.

- [ ] **Step 1: Confirm no remaining callers** — `grep -rn "order-tracking-link\|createOrderTrackingLink" app lib tests` → expect ZERO hits (Task 5 removed both). If any remain, STOP and report.
- [ ] **Step 2: Delete** — `git rm lib/order-tracking-link.ts tests/auth/order-tracking-link.test.ts`.
- [ ] **Step 3: tsc + full suite** — `npx tsc --noEmit && npm test`. Expected: all green (no dangling imports).
- [ ] **Step 4: Commit** — `git commit -m "chore: remove order-tracking-link, superseded by the durable /open access link"`

---

## Task 7: Verify + Mind maintenance

**Files:** Create `fairy-tale-mind/map/decisions/2026-06-17-durable-order-access-link.md`; modify `fairy-tale-mind/map/zones/auth-gating.md` (and `checkout.md` — it owns the webhook).

- [ ] **Step 1: Decision record** — create `fairy-tale-mind/map/decisions/2026-06-17-durable-order-access-link.md`:

```markdown
---
type: decision
summary: "Order emails (preview-ready/delivered/confirmation) link a DURABLE, reusable /open/<token> order-access link (orders.accessToken, 30-day, refreshed per send) instead of a single-use 7-day Better Auth magic-link behind the confirm interstitial. /open re-mints a short-lived internal magic-link verification and hands off to auth.api.magicLinkVerify server-side, so it reuses BA's real verify→session flow and signs the customer in instantly with no interstitial. Supersedes lib/order-tracking-link.ts for order emails; the interactive sign-in magic link is unchanged."
tags: [auth, customer-area, email]
status: active
created: 2026-06-17
related: ["[[auth-gating]]", "[[checkout]]", "[[prod-better-auth-url-canonical]]"]
sources:
  - "lib/order-access.ts"
  - "lib/order-access-token.ts"
  - "app/(site)/(app)/open/[token]/route.ts"
  - "fairy-tale-mind/specs/2026-06-17-durable-order-access-link-design.md"
decided: 2026-06-17
supersededBy: ""
---

## Context
The "watch your preview" email linked a single-use, 7-day magic-link token behind
the /sign-in/verify confirm interstitial. A second click, a double-submit, or
opening the email a few days later → "this link has expired or was already used",
defeating the link's purpose. Receiving the email at the order address already
proves ownership, so the link shouldn't behave like a one-shot sign-in.

## Decision
- Each order carries `accessToken` + `accessTokenExpiresAt` (30 days, refreshed on
  every status email). The token is durable and never consumed.
- Status + confirmation emails link `/open/<token>`. That public route resolves the
  order, re-mints a SHORT-LIVED internal BA magic-link verification for the owner,
  and returns `auth.api.magicLinkVerify({asResponse:true})` — session cookie + 302
  to the order, instantly, no interstitial.
- Expired/unknown → `/open/expired` ("sign in with your email", links to /sign-in).
- The interactive sign-in magic link is UNCHANGED (short, single-use, interstitial).

## Why
- Reuses BA's real verify→session path (proven by the old order-tracking-link test)
  rather than hand-rolling sessions.
- Reusable + 30-day matches how parents actually open order emails.

## Consequences / trade-off
- A reusable emailed link grants a full session to anyone holding it for ≤30 days
  (forwarded email, or a link-prefetcher that completes the redirect and keeps
  cookies). Blast radius: the customer's own orders + profile (no payment/PII edit).
  Accepted by the brand owner for preview convenience; mitigations = the 30-day cap
  + the "sign in again" fallback. A one-tap "Open my preview" button (blocks passive
  prefetch) and a studio "regenerate link" (revoke) are noted future options.
- `lib/order-tracking-link.ts` removed (superseded for order emails).
- New column `orders.access_token` (+ `_expires_at`, indexed); migration
  `20260617_000000_orders_access_token`.
```

- [ ] **Step 2: Update `auth-gating` zone** — add to its `owns.globs`: `lib/order-access.ts`, `lib/order-access-token.ts`, `app/(site)/(app)/open/**`, `tests/lib/order-access-token.test.ts`, `tests/auth/order-access.test.ts`; REMOVE `lib/order-tracking-link.ts` + `tests/auth/order-tracking-link.test.ts` from its globs (deleted); add `[[2026-06-17-durable-order-access-link]]` to `related`; add a sentence to the body describing the /open durable-link flow; set `verifiedAt` to the current HEAD sha (`git rev-parse --short HEAD`).
- [ ] **Step 3: Re-stamp `checkout` zone** — it owns `app/api/stripe/webhook/route.ts` (changed in Task 5): add `[[2026-06-17-durable-order-access-link]]` to `related`, a one-line body note (confirmation email now uses the /open link), and set its `verifiedAt` to HEAD.
- [ ] **Step 4: Regenerate + commit** — `npm run mind` (expect stale unchanged at the 2 pre-existing — `auth-gating`/`checkout` fresh; if `testing` goes stale from the new/removed test files, re-stamp it too). `git add fairy-tale-mind/ && git commit -m "docs(mind): durable order-access link — decision record + auth-gating/checkout re-stamp"`

---

## Self-Review

**1. Spec coverage:** §1 token data → Tasks 1,2,3; §2 /open route → Task 4; §3 emails switch → Task 5; §4 expired page → Task 4; §6 tests → Tasks 1,3,4,5; §7 Mind → Task 7; §8 out-of-scope respected (sign-in magic link untouched; no revoke UI). The supersede/removal (§3 "decide during planning") is resolved: REMOVE (Task 6), since the grep shows the only callers are the two email builders.

**2. Placeholders:** none — every code step has full content; the migration `<date>` is the stamp convention; Task 5 Step 3 says "read both test files and adapt" because the exact existing assertions must be matched, but states precisely what to assert (ensureOrderAccessToken called with the order id; CTA href is `/open/<token>`).

**3. Type/name consistency:** `newAccessToken`, `accessTokenExpiresAt`, `isAccessTokenLive` (Task 1) are imported by `lib/order-access.ts` (Task 3) and used in the route (Task 4). `ensureOrderAccessToken`/`resolveOrderByAccessToken`/`mintEphemeralSignin` names match across Tasks 3, 4, 5. Field names `accessToken`/`accessTokenExpiresAt` match between the collection (Task 2), the cores (Task 3), and the migration columns `access_token`/`access_token_expires_at`. The route import path `@/app/(site)/(app)/open/[token]/route` matches the file created in Task 4.
