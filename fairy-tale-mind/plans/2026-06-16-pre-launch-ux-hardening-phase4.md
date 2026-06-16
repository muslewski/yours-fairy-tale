# Pre-launch UX Hardening — Phase 4 (Post-purchase UX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Any user-facing copy must clear the `brand-voice` skill (CLAUDE.md mandate).

**Goal:** Make the post-purchase journey land the parent where they intend: deep-linked sign-in, a friendly expired-link page, one-click status emails that open the order, a revision-request receipt in the notes thread, the preview still watchable during revisions, and a complete order-detail loading skeleton.

**Architecture:** Six small, independent changes across the auth pages, the status-email helper, the order-detail page, and one server action. No schema changes. Each is separately committable and TDD where a seam exists.

**Tech Stack:** Next.js 16 App Router, React 19, Better Auth (magic-link plugin — verify supports `errorCallbackURL`, confirmed in `node_modules/better-auth/dist/plugins/magic-link/index.mjs`), Payload Local API, Resend, vitest, Playwright (Layer A).

**Spec:** `fairy-tale-mind/specs/2026-06-15-pre-launch-ux-hardening-design.md` (Phase 4).
**Branch:** `feat/pre-launch-ux-hardening` (Phases 1–2 already merged to local `staging`).

---

## Task 1: Sign-in honors `?next=` (+ gentle `?error=`)

**Files:**
- Create: `lib/safe-redirect.ts`, `tests/lib/safe-redirect.test.ts`
- Modify: `app/(site)/(app)/sign-in/page.tsx` (consume `?next=`, surface `?error=`, wrap in Suspense), `app/(site)/(app)/sign-in/verify/page.tsx` (reuse the shared helper)

Today `signIn.magicLink({ email, callbackURL: "/app" })` hardcodes `/app`, so a parent who clicked a deep link to a specific order (the proxy/layout set `?next=/app/orders/123`) still lands on the list. Carry `?next=` through as the magic-link `callbackURL`.

- [ ] **Step 1: Write the failing helper test**

Create `tests/lib/safe-redirect.test.ts`:
```ts
import { expect, test } from "vitest";

import { safeRelativePath } from "@/lib/safe-redirect";

test("accepts a same-site relative path", () => {
  expect(safeRelativePath("/app/orders/123")).toBe("/app/orders/123");
});

test("rejects protocol-relative and absolute URLs (open-redirect guard)", () => {
  expect(safeRelativePath("//evil.com")).toBe("/app");
  expect(safeRelativePath("https://evil.com")).toBe("/app");
});

test("falls back when empty/null", () => {
  expect(safeRelativePath(null)).toBe("/app");
  expect(safeRelativePath(undefined)).toBe("/app");
  expect(safeRelativePath("")).toBe("/app");
});

test("honors a custom fallback", () => {
  expect(safeRelativePath(null, "/sign-in")).toBe("/sign-in");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/lib/safe-redirect.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the helper**

Create `lib/safe-redirect.ts`:
```ts
/**
 * Open-redirect guard for post-auth `callbackURL`/`next` values: only same-site
 * relative paths are allowed. A protocol-relative (`//host`) or absolute URL, or
 * anything not starting with `/`, falls back. Shared by the sign-in + verify pages.
 */
export function safeRelativePath(
  path: string | null | undefined,
  fallback = "/app",
): string {
  return path && path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- tests/lib/safe-redirect.test.ts` → PASS (4).

- [ ] **Step 5: Consume `?next=` in the sign-in page**

In `app/(site)/(app)/sign-in/page.tsx`:

Update the imports:
```tsx
import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

import { authClient } from "@/lib/auth-client";
import { safeRelativePath } from "@/lib/safe-redirect";
```
Rename the current `export default function SignInPage()` to `function SignInForm()` (keep its entire body), then inside it add, near the other hooks:
```tsx
  const searchParams = useSearchParams();
  const next = safeRelativePath(searchParams.get("next"));
  const linkError = searchParams.get("error");
```
Change the magic-link call from `callbackURL: "/app"` to:
```tsx
    const result = await authClient.signIn.magicLink({
      email,
      callbackURL: next,
    });
```
Surface the gentle error: directly above the form's existing error/sent messaging (find where `errorMessage`/`status` is rendered near the form), add a calm banner when redirected back with `?error=`:
```tsx
        {linkError && status === "idle" ? (
          <p role="status" className="mb-4 text-sm font-semibold text-brand-deep/70">
            That sign-in link didn&apos;t work. Enter your email and we&apos;ll send a fresh one.
          </p>
        ) : null}
```
Finally, add the Suspense boundary required for `useSearchParams()` in a statically-rendered client route — add at the END of the file:
```tsx
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
```

- [ ] **Step 6: Reuse the helper in the verify page (DRY)**

In `app/(site)/(app)/sign-in/verify/page.tsx`, replace the inline `safeCallback` function (lines 22–25) and its call with the shared helper:
```tsx
import { safeRelativePath } from "@/lib/safe-redirect";
```
Delete the local `safeCallback` definition; change `const cb = safeCallback(callbackURL);` to `const cb = safeRelativePath(callbackURL);`.

- [ ] **Step 7: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add lib/safe-redirect.ts tests/lib/safe-redirect.test.ts "app/(site)/(app)/sign-in/page.tsx" "app/(site)/(app)/sign-in/verify/page.tsx"
git commit -m "feat(auth): sign-in honors ?next= deep links (shared open-redirect guard)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Magic-link expired/used error page

**Files:**
- Create: `app/(site)/(app)/sign-in/verify/error/page.tsx`
- Modify: `app/(site)/(app)/sign-in/verify/page.tsx` (add `errorCallbackURL` to the verify form)
- Test: `e2e/magic-link-error.spec.ts` (new, Layer A)

Better Auth's verify endpoint redirects to `errorCallbackURL?error=<code>` when a token is expired/used/invalid (confirmed in the plugin source). Today no `errorCallbackURL` is passed, so a dead link yields a bare/unhelpful result. Add the param + a branded page.

- [ ] **Step 1: Write the failing Layer-A test**

Create `e2e/magic-link-error.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("@layerA expired magic-link page explains and offers a fresh link", async ({ page }) => {
  await page.goto("/sign-in/verify/error?error=INVALID_TOKEN");
  await expect(
    page.getByRole("heading", { name: /expired or was already used/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /request a new link/i })).toHaveAttribute(
    "href",
    "/sign-in",
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- e2e/magic-link-error.spec.ts`
Expected: FAIL — the route does not exist. (Sandbox: note it; CI runs it.)

- [ ] **Step 3: Create the error page**

Create `app/(site)/(app)/sign-in/verify/error/page.tsx` (server component; the gate route group provides the centered card layout):
```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in link problem — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default function VerifyErrorPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
        <h1
          className="text-3xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          This link has expired or was already used
        </h1>
        <p className="mt-3 text-brand-deep/70">
          Sign-in links work once and for a short time. Request a fresh one and
          we&apos;ll email it to the address you used for your order.
        </p>
        <Link
          href="/sign-in"
          className="mt-7 inline-flex rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic"
        >
          Request a new link
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire `errorCallbackURL` into the verify form**

In `app/(site)/(app)/sign-in/verify/page.tsx`, inside the `<form method="GET" action="/api/auth/magic-link/verify">`, add a third hidden input alongside the existing two:
```tsx
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="callbackURL" value={cb} />
          <input type="hidden" name="errorCallbackURL" value="/sign-in/verify/error" />
```

- [ ] **Step 5: Run the test** → PASS (or note sandbox; CI runs it).

- [ ] **Step 6: Commit**
```bash
git add "app/(site)/(app)/sign-in/verify/error/page.tsx" "app/(site)/(app)/sign-in/verify/page.tsx" e2e/magic-link-error.spec.ts
git commit -m "feat(auth): branded expired/used magic-link error page (errorCallbackURL)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: One-click status emails (open the order, not bare sign-in)

**Files:**
- Modify: `lib/order-status-email.ts` (mint a tracking link), `collections/Orders.ts` (pass `orderId`)
- Test: `tests/app/status-email-link.test.ts` (new); check/adjust `tests/app/status-emails.test.ts`

Today the `proof_ready`/`delivered` emails link to a hardcoded `https://yoursfairytale.com/sign-in`. Use `createOrderTrackingLink` with `callbackURL=/app/orders/${orderId}` so one click signs in AND opens the specific order.

- [ ] **Step 1: Write the failing unit test**

Create `tests/app/status-email-link.test.ts`:
```ts
import { expect, test, vi } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/order-tracking-link", () => ({
  createOrderTrackingLink: vi
    .fn()
    .mockResolvedValue("https://example.com/sign-in/verify?token=abc&callbackURL=%2Fapp%2Forders%2Forder_1"),
}));

import { sendEmail } from "@/lib/email";
import { createOrderTrackingLink } from "@/lib/order-tracking-link";
import { sendStatusTransitionEmail } from "@/lib/order-status-email";

test("status email links to the order via a one-click tracking link, not bare /sign-in", async () => {
  await sendStatusTransitionEmail({
    orderId: "order_1",
    ownerEmail: "ada@example.com",
    newStatus: "proof_ready",
    childName: "Mia",
  });

  // The tracking link was minted with a callbackURL deep-linking to the order.
  expect(createOrderTrackingLink).toHaveBeenCalledWith(
    expect.objectContaining({ email: "ada@example.com", callbackURL: "/app/orders/order_1" }),
  );
  // The sent email embeds that link and no longer hardcodes /sign-in.
  const html = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0].html as string;
  expect(html).toContain("/sign-in/verify?token=abc");
  expect(html).not.toContain("yoursfairytale.com/sign-in\"");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/app/status-email-link.test.ts`
Expected: FAIL — `sendStatusTransitionEmail` has no `orderId` param and never calls `createOrderTrackingLink`.

- [ ] **Step 3: Mint the tracking link in the email helper**

In `lib/order-status-email.ts`, add the import:
```ts
import { createOrderTrackingLink } from "@/lib/order-tracking-link";
```
Change the `sendStatusTransitionEmail` signature + body. Replace the params block and the hardcoded `cta` with:
```ts
export async function sendStatusTransitionEmail({
  orderId,
  ownerEmail,
  newStatus,
  childName,
}: {
  orderId: string;
  ownerEmail: string;
  newStatus: "proof_ready" | "delivered";
  childName?: string | null;
}): Promise<void> {
  const { headline, body } = messageForStatus(newStatus, childName ?? undefined);
  const accent = newStatus === "delivered" ? "blue" : "pink";
  const label = newStatus === "delivered" ? "Watch now" : "Watch your preview";

  try {
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yoursfairytale.com"
    ).replace(/\/$/, "");
    const href = await createOrderTrackingLink({
      email: ownerEmail,
      baseUrl,
      callbackURL: `/app/orders/${orderId}`,
    });

    const html = renderBrandedEmail({
      preheader: headline,
      heading: headline,
      accent,
      bodyHtml: emailParagraphs([body]),
      cta: { label, href },
    });

    await sendEmail({ to: ownerEmail, subject: headline, html });
  } catch (err) {
    console.error(
      `[orders/hook] Status-transition email failed (status: ${newStatus}, owner: ${ownerEmail}):`,
      err,
    );
  }
}
```
(The whole link-mint + send is now inside the existing non-fatal try/catch, preserving the "email failure never blocks the order update" invariant.)

- [ ] **Step 4: Pass `orderId` from the hook**

In `collections/Orders.ts`, update the `sendStatusTransitionEmail` call (≈line 56) to include the order id:
```ts
  await sendStatusTransitionEmail({
    orderId: String(doc.id),
    ownerEmail,
    newStatus: newStatus as "proof_ready" | "delivered",
    childName: doc.childName ?? null,
  });
```

- [ ] **Step 5: Keep the existing hook test green**

Run `tests/app/status-emails.test.ts`. If it now fails because the real `createOrderTrackingLink` runs (it mints via Better Auth and may need a real user/session), add the same `vi.mock("@/lib/order-tracking-link", …)` mock used in Step 1 to that file's top, and update any `sendStatusTransitionEmail` call there to pass `orderId`. Run:
```
npm test -- tests/app/status-email-link.test.ts tests/app/status-emails.test.ts
```
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add lib/order-status-email.ts collections/Orders.ts tests/app/status-email-link.test.ts tests/app/status-emails.test.ts
git commit -m "feat(orders): status emails deep-link to the order via one-click tracking link

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Revision request → customer notes thread

**Files:**
- Modify: `lib/order-actions.ts` (`requestProofChange`)
- Test: `tests/app/order-actions.test.ts` (add a test)

When a parent requests a proof change, the note is saved only to the staff-only `revisionNote`. Also append it to `customerNotes` so the parent sees a receipt of what they asked for. Done in the ACTION (not the core) so we reuse the existing `appendCustomerNote` without crossing the `"use server"`/cores boundary.

- [ ] **Step 1: Write the failing test**

In `tests/app/order-actions.test.ts`, add near the other `requestProofChange` test:
```ts
test("requestProofChange also leaves the parent a note receipt", async () => {
  const orderId = await makeOrder("proof_ready");
  mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

  await requestProofChange(orderId, "Could the dragon be a little friendlier?");

  const after = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });
  expect(after.status).toBe("revisions");
  expect(after.revisionNote).toBe("Could the dragon be a little friendlier?");
  // The parent now sees their request in the notes thread.
  expect(after.customerNotes?.at(-1)?.message).toBe(
    "Could the dragon be a little friendlier?",
  );
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/app/order-actions.test.ts -t "note receipt"`
Expected: FAIL — no customer note is appended.

- [ ] **Step 3: Append the note in the action**

In `lib/order-actions.ts`, update `requestProofChange` to append the note after the core transition (reusing `appendCustomerNote`, already in this file). It becomes:
```ts
export async function requestProofChange(
  orderId: string,
  note: string,
): Promise<void> {
  await assertOwnsOrder(orderId);
  await requestProofChangeCore(orderId, note);
  // Leave the parent a receipt in their notes thread (non-fatal — the proof
  // change already succeeded; appendCustomerNote no-ops on an empty/too-long note).
  await appendCustomerNote(orderId, note);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}
```

- [ ] **Step 4: Run the test** → PASS (run the whole file: `npm test -- tests/app/order-actions.test.ts`).

- [ ] **Step 5: Commit**
```bash
git add lib/order-actions.ts tests/app/order-actions.test.ts
git commit -m "feat(orders): proof-change requests also post a receipt to the customer notes thread

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Keep the preview watchable during `revisions`

**Files:**
- Modify: `app/(site)/(app)/app/orders/[id]/page.tsx` (the proof-load guard)
- Test: none (server-component render guard; verified by inspection + tsc). The proof video route (`resolveOwnedVideo(orderId, "proof")`) already gates on ownership ONLY, not status — confirmed in `lib/video-access.ts` — so no route change is needed.

Today the proof section renders only when `status === "proof_ready"`; once the parent requests a change (`revisions`) the preview vanishes, so they can't re-watch what they're commenting on.

- [ ] **Step 1: Widen the guard**

In `app/(site)/(app)/app/orders/[id]/page.tsx`, change:
```tsx
  const proof =
    status === "proof_ready"
      ? await loadProof(String(order.id), order.proof as string | null)
      : null;
```
to:
```tsx
  const proof =
    status === "proof_ready" || status === "revisions"
      ? await loadProof(String(order.id), order.proof as string | null)
      : null;
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` → clean. Confirm by inspection that the proof section's surrounding copy still reads correctly under `revisions` (it should say the preview is available; the status chip already communicates "revisions"). If the proof block has `proof_ready`-only wording, leave a calm neutral caption.

- [ ] **Step 3: Commit**
```bash
git add "app/(site)/(app)/app/orders/[id]/page.tsx"
git commit -m "fix(orders): keep the preview watchable while revisions are in progress

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Complete the order-detail loading skeleton

**Files:**
- Modify: `app/(site)/(app)/app/orders/[id]/loading.tsx`
- Test: none (loading UI; verified by tsc + inspection)

The skeleton covers the title, timeline, message panel, and story panel, but not the "Photos you sent" and "Notes" sections, so those pop in and shift the layout.

- [ ] **Step 1: Add the two missing skeleton blocks**

In `app/(site)/(app)/app/orders/[id]/loading.tsx`, after the existing story-panel block (the 2-column grid of placeholder cards) and before the closing container, add skeleton blocks for the photos and notes sections, matching the existing pulse/rounded style used in the file:
```tsx
      {/* Photos you sent */}
      <div className="mt-8">
        <div className="h-5 w-44 animate-pulse rounded bg-brand-deep/10" />
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square animate-pulse rounded-xl bg-brand-deep/10"
            />
          ))}
        </div>
      </div>

      {/* Notes */}
      <div className="mt-8">
        <div className="h-5 w-28 animate-pulse rounded bg-brand-deep/10" />
        <div className="mt-4 space-y-3">
          <div className="h-16 animate-pulse rounded-xl bg-brand-deep/10" />
          <div className="h-10 w-2/3 animate-pulse rounded-xl bg-brand-deep/10" />
        </div>
      </div>
```
(Match the actual class names the file already uses for its skeleton blocks — read the file first and mirror its `animate-pulse`/rounding/color tokens exactly rather than introducing new ones.)

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add "app/(site)/(app)/app/orders/[id]/loading.tsx"
git commit -m "fix(app): add Photos + Notes blocks to the order-detail loading skeleton

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final: Phase 4 wrap

- [ ] **Typecheck gate:** `npx tsc --noEmit` clean.
- [ ] **Targeted tests green:** `npm test -- tests/lib/safe-redirect.test.ts tests/app/status-email-link.test.ts tests/app/order-actions.test.ts tests/app/status-emails.test.ts`.
- [ ] **Mind maintenance:** re-stamp `auth-gating` (sign-in `?next=`, verify error page, proof-during-revisions, revision-note receipt, order-detail skeleton) and `checkout` (status-email tracking link lives in `lib/order-status-email.ts`, a checkout-zone glob) to HEAD; `npm run mind`; commit.

## Self-review notes (author)
- **Spec coverage (Phase 4):** magic-link error page → Task 2; sign-in `?next=` → Task 1; one-click status emails → Task 3; revision note → thread → Task 4; proof during revisions → Task 5; loading skeleton → Task 6. All six covered.
- **Placeholder scan:** none — full code, real brand-voice copy, exact paths. Two tasks (5, 6) are UI/guard-only and explicitly test-light with the reason stated.
- **Type consistency:** `safeRelativePath(path, fallback?)` defined once, used in sign-in + verify; `sendStatusTransitionEmail` gains a required `orderId` and its sole caller (Orders hook) is updated in the same task; `requestProofChange` signature unchanged (only its body appends a note via the existing `appendCustomerNote`).
- **Better Auth dependency:** `errorCallbackURL` support on the verify endpoint verified in `node_modules/better-auth/dist/plugins/magic-link/index.mjs` (redirects to `errorCallbackURL?error=<code>`).
- **Risk note:** `useSearchParams()` in the sign-in client page is wrapped in `<Suspense>` (Task 1 Step 5) to satisfy Next 16's static-render requirement.
