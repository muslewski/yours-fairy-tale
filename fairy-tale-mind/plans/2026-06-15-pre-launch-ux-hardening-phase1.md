# Pre-launch UX Hardening — Phase 1 (Trust & launch-blockers) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four launch-blocking trust items before real payments: real legal-entity details, honest social proof, the studio getting notified of customer notes, and verifying the fail-closed boot.

**Architecture:** Three small code changes (static legal copy, a hero block, a non-fatal internal email on note-add) plus one ops verification. Each task is independent and separately committable.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Payload Local API, Resend (`lib/email.ts`), vitest, Playwright.

**Spec:** `fairy-tale-mind/specs/2026-06-15-pre-launch-ux-hardening-design.md` (Phase 1).
**Branch:** `feat/pre-launch-ux-hardening` (already checked out). **Test DB:** Neon `agent-mcp-test` via `.env.test`.

---

## Task 1: Real legal-entity details

**Files:**
- Modify: `app/(site)/(legal)/privacy/page.tsx:91`, `app/(site)/(legal)/terms/page.tsx:76,82`
- Test: `tests/legal/legal-pages.test.ts` (new)

Entity (provided): **Firma Dominik Jaworski AI · NIP 5543048002 · REGON 544985902 · ul. Nad Stawem 4, 86-005 Białe Błota · Poland**. (Note: `refund/page.tsx` has no entity placeholder — leave it.)

- [ ] **Step 1: Write the failing guard test**

Create `tests/legal/legal-pages.test.ts`:
```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, test } from "vitest";

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

const LEGAL = [
  "app/(site)/(legal)/privacy/page.tsx",
  "app/(site)/(legal)/terms/page.tsx",
  "app/(site)/(legal)/refund/page.tsx",
];

test("legal pages carry no bracketed placeholders", () => {
  for (const f of LEGAL) {
    expect(read(f)).not.toMatch(/\[(registered business name|your governing)/i);
  }
});

test("terms + privacy name the real registered entity", () => {
  const terms = read("app/(site)/(legal)/terms/page.tsx");
  const privacy = read("app/(site)/(legal)/privacy/page.tsx");
  expect(terms).toContain("Firma Dominik Jaworski AI");
  expect(terms).toContain("NIP 5543048002");
  expect(terms).toContain("Poland");
  expect(privacy).toContain("Firma Dominik Jaworski AI");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/legal/legal-pages.test.ts`
Expected: FAIL — the bracketed-placeholder assertion fails (placeholders still present).

- [ ] **Step 3: Fill the entity details**

In `app/(site)/(legal)/privacy/page.tsx:91`, replace:
```
"This service is provided by Yours Fairy Tale, operated by [registered business name and address]. We may update this policy from time to time, and we will change the date at the top when we do.",
```
with:
```
"This service is provided by Yours Fairy Tale, operated by Firma Dominik Jaworski AI (NIP 5543048002, REGON 544985902), ul. Nad Stawem 4, 86-005 Białe Błota, Poland. We may update this policy from time to time, and we will change the date at the top when we do.",
```

In `app/(site)/(legal)/terms/page.tsx:76`, replace `the laws of [your governing jurisdiction]` with `the laws of Poland`.

In `app/(site)/(legal)/terms/page.tsx:82`, replace:
```
This service is operated by Yours Fairy Tale, [registered business name and address].
```
with:
```
This service is operated by Yours Fairy Tale, Firma Dominik Jaworski AI (NIP 5543048002, REGON 544985902), ul. Nad Stawem 4, 86-005 Białe Błota, Poland.
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- tests/legal/legal-pages.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/(site)/(legal)/privacy/page.tsx" "app/(site)/(legal)/terms/page.tsx" tests/legal/legal-pages.test.ts
git commit -m "fix(legal): fill real registered-entity details (Firma Dominik Jaworski AI, Poland)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> NOTE for the controller: flag to the user that the legal **wording** still needs their/a lawyer's review — this task fills identifiers only.

---

## Task 2: Replace the fabricated social proof

**Files:**
- Modify: `components/home/hero.tsx:129-145` (the avatar row + "40,000+ children already starring")
- Test: `e2e/hero-social-proof.spec.ts` (new, Layer A)

The honest replacement (brand-voice: calm, true, no numbers): a small trust line — **"Now taking our first orders — with a full preview before we animate a thing."** (Apply the `brand-voice` skill to confirm tone.)

- [ ] **Step 1: Write the failing Layer-A spec**

Create `e2e/hero-social-proof.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA hero shows honest trust copy, not an invented count", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/40,000\+/)).toHaveCount(0);
  await expect(page.getByText(/taking our first orders/i)).toBeVisible();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- e2e/hero-social-proof.spec.ts`
Expected: FAIL — "40,000+" is still present / the honest line is absent. (If Playwright can't run in this sandbox — no chromium — verify by code inspection instead and note it; CI runs it.)

- [ ] **Step 3: Replace the social-proof block**

In `components/home/hero.tsx`, replace lines 129–145 (the `<motion.div {...rise(0.4)} ...>` containing the four avatar `<span>`s and `<span>40,000+ children already starring</span>`) with:
```tsx
            <motion.div {...rise(0.4)} className="mt-8 flex items-center gap-3 text-sm font-bold">
              <span
                aria-hidden
                className="inline-block h-9 w-9 rounded-full border-[3px] border-brand-deep bg-brand-yellow"
              />
              <span>Now taking our first orders — with a full preview before we animate a thing.</span>
            </motion.div>
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test:e2e -- e2e/hero-social-proof.spec.ts`
Expected: PASS. (Or, if no browser in sandbox: `grep -n "40,000" components/home/hero.tsx` returns nothing and the new line is present.)

- [ ] **Step 5: Commit**

```bash
git add components/home/hero.tsx e2e/hero-social-proof.spec.ts
git commit -m "fix(home): replace invented '40,000+' social proof with honest pre-launch trust line

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Notify the studio when a customer adds a note

**Files:**
- Modify: `lib/order-actions.ts` (`addOrderNote`, ~line 246), `lib/required-env.ts` (optional — NOT required; uses a fallback)
- Test: `tests/app/order-actions.test.ts` (add a test)

Approach: after a customer note is successfully appended, send a **non-fatal** internal email to a studio inbox (`STUDIO_NOTIFY_EMAIL` env, falling back to `hello@yoursfairytale.com`). Reuse `sendEmail` from `@/lib/email` and `renderBrandedEmail`/`emailParagraphs` from `@/lib/email-template`.

- [ ] **Step 1: Write the failing test**

In `tests/app/order-actions.test.ts`, add (the file already mocks `getCustomerSession`/owns-order patterns and DB-seeds; mirror its existing setup). Add near the other `addOrderNote` tests:
```ts
import { sendEmail } from "@/lib/email";
// at top of file, alongside other vi.mock calls:
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

test("addOrderNote sends a non-fatal studio notification", async () => {
  // seedOwnedOrder() is the file's existing helper that creates an order owned
  // by the mocked session user; reuse it. If named differently, use the same
  // setup the other addOrderNote tests use.
  const { orderId } = await seedOwnedOrder();
  (sendEmail as unknown as ReturnType<typeof vi.fn>).mockClear();

  const res = await addOrderNote(orderId, "Please fix her name to 'Mia'.");
  expect(res.ok).toBe(true);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  const arg = (sendEmail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
  expect(arg.subject).toMatch(/note/i);
});
```
(If the existing file uses a different owned-order setup helper, match it exactly — read the file's existing `addOrderNote` tests first.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/app/order-actions.test.ts -t "studio notification"`
Expected: FAIL — `sendEmail` not called (addOrderNote doesn't email yet).

- [ ] **Step 3: Implement the notification**

In `lib/order-actions.ts`, add imports near the top:
```ts
import { sendEmail } from "@/lib/email";
import { emailParagraphs, renderBrandedEmail } from "@/lib/email-template";
```
Add a helper above `addOrderNote`:
```ts
/**
 * Non-fatal internal heads-up to the studio that a parent left a note. Never
 * throws — the note is already saved; a failed email must not fail the action.
 */
async function notifyStudioOfNote(orderId: string, message: string): Promise<void> {
  const to = process.env.STUDIO_NOTIFY_EMAIL ?? "hello@yoursfairytale.com";
  try {
    await sendEmail({
      to,
      subject: `New customer note on order ${orderId}`,
      html: renderBrandedEmail({
        preheader: "A parent left a note on their order.",
        heading: "New customer note",
        accent: "blue",
        bodyHtml: emailParagraphs([
          `Order: ${orderId}`,
          `Note: ${message}`,
          "Open the studio workstation to reply.",
        ]),
      }),
    });
  } catch (err) {
    console.error("[order-actions] studio note notification failed (non-fatal):", err);
  }
}
```
Then in `addOrderNote`, after the note is appended successfully and before returning, call it:
```ts
export async function addOrderNote(
  orderId: string,
  message: string,
): Promise<AddNoteResult> {
  await assertOwnsOrder(orderId);
  const result = await appendCustomerNote(orderId, message);
  if (result.ok) {
    await notifyStudioOfNote(orderId, message);
    revalidatePath(`/app/orders/${orderId}`);
  }
  return result;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- tests/app/order-actions.test.ts`
Expected: PASS (all existing + the new test).

- [ ] **Step 5: Commit**

```bash
git add lib/order-actions.ts tests/app/order-actions.test.ts
git commit -m "feat(orders): email the studio when a customer adds a note (non-fatal)

Closes the studio-not-notified-of-customer-notes gap. Recipient is
STUDIO_NOTIFY_EMAIL, falling back to hello@yoursfairytale.com.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> NOTE for the controller: tell the user to set `STUDIO_NOTIFY_EMAIL` in Vercel prod (+ staging) to the inbox they actually watch; otherwise it goes to `hello@yoursfairytale.com`.

---

## Task 4: Verify the fail-closed boot on Vercel (ops verification — no TDD)

**Files:** none (verification). Confirms `verify-fail-closed-boot-on-vercel`, `better-auth-url-unset`, `better-auth-kysely-build-break`.

- [ ] **Step 1: Confirm the production build is green**

The latest `main` production deploy must be `READY` (build passes → `better-auth-kysely-build-break` is not occurring). Check the Vercel deployments list (MCP `list_deployments`) for the newest `target: production` = `READY`. Expected: READY.

- [ ] **Step 2: Confirm `BETTER_AUTH_URL` is set in production**

Run: `vercel env ls 2>&1 | grep -i BETTER_AUTH_URL`
Expected: a row scoped to `Production`. (If missing, that's the fix — add it = the prod app's base URL.)

- [ ] **Step 3: Verify fail-closed actually fails closed**

On the **staging** project (once it exists) or a throwaway preview: deploy with one required env var removed (e.g. unset `RESEND_API_KEY` for that deploy) and confirm the app **500s every request** rather than serving degraded. `instrumentation.ts register()` throws via `missingProductionEnv` → the deploy must be unusable, not silently up. Document the result in the tech-debt note.

- [ ] **Step 4: Record the outcome**

Update `fairy-tale-mind/tech-debt/verify-fail-closed-boot-on-vercel.md`: mark verified (or file the gap if it serves degraded). Commit:
```bash
git add fairy-tale-mind/tech-debt/verify-fail-closed-boot-on-vercel.md
git commit -m "docs(tech-debt): record fail-closed boot verification result

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final: Phase 1 wrap

- [ ] **Mind maintenance:** re-stamp the `app-shell` (legal pages) + `homepage` (hero) + `studio`/`payload-backend` (note email) zones to HEAD; close `legal-pages-need-entity-and-review` and `studio-not-notified-of-customer-notes` tech-debt notes (tombstone/supersede per the Ledger rules); `npm run mind`; commit.
- [ ] **Typecheck gate:** `npx tsc --noEmit` clean before any merge to `main` (the Vercel build type-checks everything).

## Self-review notes (author)
- **Spec coverage (Phase 1):** legal → Task 1; social proof → Task 2; studio-notify → Task 3; fail-closed/BETTER_AUTH_URL/build → Task 4. All four covered.
- **Placeholder scan:** none — complete before/after copy + full email code given. The Task-3 test references the file's existing owned-order setup helper; the implementer must match its real name (flagged inline).
- **Type consistency:** `sendEmail({to,subject,html})`, `renderBrandedEmail`/`emailParagraphs` signatures match `lib/email.ts` + `lib/email-template.ts`. `addOrderNote`/`appendCustomerNote`/`AddNoteResult` unchanged.
- **Open input:** legal **wording** review (user/lawyer) — flagged, not blocking the identifier fill.
