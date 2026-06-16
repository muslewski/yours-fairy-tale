# Pre-launch UX Hardening — Phase 5 (Studio & global polish) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Any user-facing copy must clear the `brand-voice` skill (CLAUDE.md mandate).

**Goal:** Tighten the studio workstation and close global accessibility gaps before launch: a confirm step before destructive order transitions, honest in-flight button feedback, helpful studio hints, a past-date delivery guard, a non-leaky photo `alt`, a focus-trapped notes dialog, and visible focus rings.

**Architecture:** Seven small, independent UI changes across the studio components and a few global surfaces. Two have a pure, unit-testable helper (`isDestructiveStatus`, `isPastDate`); the rest are UI/a11y polish verified by `tsc` + inspection (and one Layer-A e2e for the dialog). Each is separately committable.

**Tech Stack:** Next.js 16 App Router, React 19 (`useTransition`), Tailwind v4, Motion, vitest, Playwright (Layer A).

**Spec:** `fairy-tale-mind/specs/2026-06-15-pre-launch-ux-hardening-design.md` (Phase 5).
**Branch:** `feat/pre-launch-ux-hardening` (Phases 1, 2, 4 already merged to local `staging`).

> **Testing note:** these are UI/a11y changes; most have no unit seam, so they're verified by `npx tsc --noEmit` + inspection, with reasons stated. The two that DO have a pure seam (destructive-status set, past-date check) are TDD. This is intentional, not a coverage gap.

---

## Task 1: Confirm before destructive order transitions

**Files:**
- Create: `lib/studio-status.ts`, `tests/lib/studio-status.test.ts`
- Modify: `components/studio/workflow-card.tsx`

`workflow-card.tsx` lets staff move an order to any status, including `cancelled`/`refunded`, with a single click (`applyStatus(to)`). Add an inline confirm step for those two.

- [ ] **Step 1: Write the failing helper test**

Create `tests/lib/studio-status.test.ts`:
```ts
import { expect, test } from "vitest";

import { isDestructiveStatus } from "@/lib/studio-status";

test("cancelled and refunded are destructive", () => {
  expect(isDestructiveStatus("cancelled")).toBe(true);
  expect(isDestructiveStatus("refunded")).toBe(true);
});

test("normal production statuses are not destructive", () => {
  for (const s of ["paid", "awaiting_assets", "in_production", "proof_ready", "delivered", "approved"]) {
    expect(isDestructiveStatus(s)).toBe(false);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/lib/studio-status.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the helper**

Create `lib/studio-status.ts`:
```ts
/** Order statuses that end the production relationship and warrant a confirm step. */
const DESTRUCTIVE_STATUSES = new Set(["cancelled", "refunded"]);

export function isDestructiveStatus(status: string): boolean {
  return DESTRUCTIVE_STATUSES.has(status);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- tests/lib/studio-status.test.ts` → PASS (2).

- [ ] **Step 5: Add the inline confirm to the workflow card**

Read `components/studio/workflow-card.tsx` first. It is `"use client"` with `const [pending, startTransition] = useTransition();` and an `applyStatus(to)` that calls the `setOrderStatus` server action; status options render as buttons calling `applyStatus(step.to)` (and a "Set any status" fallback).

Add the import:
```tsx
import { isDestructiveStatus } from "@/lib/studio-status";
```
Add a confirm state alongside the existing state:
```tsx
  const [confirming, setConfirming] = useState<string | null>(null);
```
(Ensure `useState` is imported from `react`.)

Introduce a single click entry point that gates destructive targets through confirm, and have ALL status buttons (both the `nextSteps` buttons and the "Set any status" fallback) call it instead of `applyStatus` directly:
```tsx
  function requestStatus(to: string) {
    if (isDestructiveStatus(to)) {
      setConfirming(to);
      return;
    }
    applyStatus(to);
  }
```
Render a confirm prompt when `confirming` is set (place it just above the error message at the bottom of the card):
```tsx
      {confirming ? (
        <div className="mt-4 rounded-xl border-2 border-brand-deep bg-brand-cream p-4">
          <p className="text-sm font-bold text-brand-deep">
            Move this order to &ldquo;{confirming}&rdquo;? This tells the customer their
            order is {confirming}.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const to = confirming;
                setConfirming(null);
                applyStatus(to);
              }}
              disabled={pending}
              className="rounded-full border-2 border-brand-deep bg-brand-pink px-5 py-2 text-sm font-bold text-white shadow-comic-sm disabled:opacity-60"
            >
              Yes, set {confirming}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="rounded-full border-2 border-brand-deep bg-white px-5 py-2 text-sm font-bold text-brand-deep"
            >
              Keep as-is
            </button>
          </div>
        </div>
      ) : null}
```
Change the existing status buttons' `onClick={() => applyStatus(step.to)}` (and the fallback selector's apply) to `onClick={() => requestStatus(step.to)}`.

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit` → clean. `npm test -- tests/lib/studio-status.test.ts` → PASS.
```bash
git add lib/studio-status.ts tests/lib/studio-status.test.ts components/studio/workflow-card.tsx
git commit -m "feat(studio): confirm step before cancelling/refunding an order

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: In-flight feedback on studio buttons

**Files:**
- Modify: `components/studio/workflow-card.tsx`, `components/studio/promised-by-editor.tsx`
- Test: none (UI state; `tsc` + inspection). Both already have `const [pending, startTransition] = useTransition()`.

Today both only set `disabled={pending}` (opacity dip) with no label/aria signal — staff can't tell a slow save is in progress.

- [ ] **Step 1: workflow-card buttons**

In `components/studio/workflow-card.tsx`, on the status buttons add `aria-busy={pending}` and, while pending, show a saving label. For the primary/secondary status buttons whose label is `step.label`, render `{pending ? "Saving…" : step.label}` and add `aria-busy={pending}`. (Keep `disabled={pending}`.)

- [ ] **Step 2: promised-by-editor save button**

In `components/studio/promised-by-editor.tsx`, the Save button is `disabled={pending || !value}`. Change its content to `{pending ? "Saving…" : "Save"}` (match the existing label text the file uses) and add `aria-busy={pending}`.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add components/studio/workflow-card.tsx components/studio/promised-by-editor.tsx
git commit -m "feat(studio): show 'Saving…' + aria-busy on in-flight studio actions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Past-date delivery guard

**Files:**
- Create: `tests/lib/date-guard.test.ts`
- Modify: `lib/delivery.ts` (add `isPastDate` helper) OR create `lib/date-guard.ts`; `components/studio/promised-by-editor.tsx`
- Decision: add `isPastDate` to a small new `lib/date-guard.ts` (keeps `lib/delivery.ts` focused on the promise-window math).

The promised-by date input has no `min` and no past-date warning, so staff can fat-finger a date in the past.

- [ ] **Step 1: Write the failing helper test**

Create `tests/lib/date-guard.test.ts`:
```ts
import { expect, test } from "vitest";

import { isPastDate } from "@/lib/date-guard";

const today = "2026-06-16";

test("a date before today is past", () => {
  expect(isPastDate("2026-06-15", today)).toBe(true);
});

test("today is not past", () => {
  expect(isPastDate("2026-06-16", today)).toBe(false);
});

test("a future date is not past", () => {
  expect(isPastDate("2026-06-20", today)).toBe(false);
});

test("an empty value is not flagged", () => {
  expect(isPastDate("", today)).toBe(false);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/lib/date-guard.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create the helper**

Create `lib/date-guard.ts`:
```ts
/**
 * True when `value` (an ISO yyyy-mm-dd date string) is strictly before
 * `todayISO` (same format). Empty/missing values are never flagged — the caller
 * decides whether empty is allowed. String comparison is valid for zero-padded
 * ISO dates.
 */
export function isPastDate(value: string, todayISO: string): boolean {
  if (!value) return false;
  return value < todayISO;
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- tests/lib/date-guard.test.ts` → PASS (4).

- [ ] **Step 5: Wire it into the editor**

In `components/studio/promised-by-editor.tsx` (`"use client"`):
```tsx
import { isPastDate } from "@/lib/date-guard";
```
Compute today once in the component body:
```tsx
  const todayISO = new Date().toISOString().slice(0, 10);
```
Add `min={todayISO}` to the `<input type="date">`. Below the input (before the save button), add a calm warning when the chosen date is in the past:
```tsx
      {isPastDate(value, todayISO) ? (
        <p className="mt-2 text-sm font-semibold text-brand-pink">
          That date is in the past. Pick today or later.
        </p>
      ) : null}
```
Disable Save when the date is past: change the button's `disabled={pending || !value}` to `disabled={pending || !value || isPastDate(value, todayISO)}`.

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit` → clean. `npm test -- tests/lib/date-guard.test.ts` → PASS.
```bash
git add lib/date-guard.ts tests/lib/date-guard.test.ts components/studio/promised-by-editor.tsx
git commit -m "feat(studio): guard the promised-by date against past dates (min + warning)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Studio hints

**Files:**
- Modify: `app/(site)/studio/(gated)/orders/[id]/page.tsx` (proof hint), `app/(site)/studio/sign-in/page.tsx` (reset-password hint)
- Test: none (static copy; inspection).

- [ ] **Step 1: Proof-status hint on the order page**

In `app/(site)/studio/(gated)/orders/[id]/page.tsx`, near the proof `VideoUpload` (the one with `kind="proof"`), add a hint visible when the order is awaiting the parent's review. Add, just above that `VideoUpload`, a conditional line:
```tsx
        {status === "proof_ready" ? (
          <p className="mb-3 text-sm font-semibold text-brand-deep/70">
            The preview is with the parent — they&apos;ll approve it or request a change.
          </p>
        ) : null}
```
(Confirm the page already has the order `status` in scope; if it's named differently, use the existing status variable.)

- [ ] **Step 2: Password-reset hint on studio sign-in**

In `app/(site)/studio/sign-in/page.tsx`, after the intro paragraph ("Sign in with your staff account."), add:
```tsx
          <p
            className="mt-1 text-center text-xs text-brand-deep/55"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Forgot your password? Reset it in the Payload admin at /admin.
          </p>
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add "app/(site)/studio/(gated)/orders/[id]/page.tsx" "app/(site)/studio/sign-in/page.tsx"
git commit -m "feat(studio): add proof-with-parent hint + password-reset hint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Don't leak the raw blob filename in photo `alt`

**Files:**
- Modify: `app/(site)/studio/(gated)/orders/[id]/page.tsx` (≈line 217)
- Test: none (one-line attribute; inspection).

Line 217 currently sets `alt={m.filename ?? "customer photo"}` — the raw blob filename is meaningless to screen readers and can leak an opaque pathname.

- [ ] **Step 1: Use a stable, meaningful alt**

Change `alt={m.filename ?? "customer photo"}` to `alt="Customer photo"`. (Leave the `title={m.filename ...}` on the missing-file placeholder as-is — that's a staff hover affordance, not assistive text.)

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add "app/(site)/studio/(gated)/orders/[id]/page.tsx"
git commit -m "fix(studio): use a meaningful photo alt instead of the raw blob filename

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Focus-trap the customer notes dialog

**Files:**
- Modify: `components/app/order-notes.tsx`
- Test: `e2e/notes-dialog.spec.ts` (new, Layer A)

The dialog (`role="dialog"`, `aria-modal`, Escape-to-close) does not trap focus or auto-focus on open, and uses `aria-label` rather than a labelled heading. Add focus management.

- [ ] **Step 1: Write the failing Layer-A test**

Create `e2e/notes-dialog.spec.ts`. The notes dialog lives on the customer order-detail page (gated), so a pure Layer-A test cannot reach it without auth. Instead, assert the accessibility wiring that IS reachable is correct — if the dialog can't be opened unauthenticated, mark this spec `test.skip` with a note and rely on inspection. Prefer this minimal shape, and if the trigger isn't reachable without a session, convert to a Layer-B (DB-seeded) test under the existing harness:
```ts
import { expect, test } from "@playwright/test";

// The notes dialog is behind the /app gate. If a seeded session isn't available
// in this lane, this spec is skipped and the change is inspection-verified.
test.skip("@layerA notes dialog traps focus and is labelled by its heading", async () => {
  // Placeholder for a Layer-B seeded run; see plan note.
});
```
(Do NOT leave a fake-passing test. If no auth lane exists here, the focus-trap is verified by code inspection per the testing note at the top — record that in the commit.)

- [ ] **Step 2: Add focus management + `aria-labelledby`**

In `components/app/order-notes.tsx`, read the dialog block first. Then:
1. Add a heading with an id inside the dialog and point the container at it:
```tsx
   <h2 id="notes-dialog-title" className="...existing heading classes...">Add a note for the studio</h2>
```
   Replace `aria-label="Add a note for the studio"` on the dialog container with `aria-labelledby="notes-dialog-title"`.
2. Auto-focus the textarea when the dialog opens. Add a ref and effect:
```tsx
   const textareaRef = useRef<HTMLTextAreaElement>(null);
   useEffect(() => {
     if (open) textareaRef.current?.focus();
   }, [open]);
```
   (Import `useEffect`, `useRef` from `react`; attach `ref={textareaRef}` to the textarea.)
3. Trap Tab within the dialog. On the dialog container's existing `onKeyDown` (which already handles Escape), also handle Tab cycling:
```tsx
   onKeyDown={(e) => {
     if (e.key === "Escape") { close(); return; }
     if (e.key !== "Tab") return;
     const root = e.currentTarget as HTMLElement;
     const focusable = root.querySelectorAll<HTMLElement>(
       'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
     );
     if (focusable.length === 0) return;
     const first = focusable[0];
     const last = focusable[focusable.length - 1];
     if (e.shiftKey && document.activeElement === first) {
       e.preventDefault();
       last.focus();
     } else if (!e.shiftKey && document.activeElement === last) {
       e.preventDefault();
       first.focus();
     }
   }}
```

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add components/app/order-notes.tsx e2e/notes-dialog.spec.ts
git commit -m "fix(a11y): focus-trap + label the customer notes dialog

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Visible focus rings on global interactive elements

**Files:**
- Modify: `app/(site)/error.tsx`, `app/(site)/not-found.tsx`, `components/home/faq.tsx`, `app/(site)/studio/sign-in/page.tsx`
- Test: none (class additions; inspection). The order-notes textarea already has a ring (untouched).

Keyboard users get no visible focus indicator on these. Add a consistent ring token.

- [ ] **Step 1: Add the ring to each element**

Append this exact utility group to each element's `className` string:
```
focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/60
```
Apply to:
- `app/(site)/error.tsx` — the reset/try-again `<button>`.
- `app/(site)/not-found.tsx` — the home `<Link>`/anchor.
- `components/home/faq.tsx` — the `<summary>` element(s).
- `app/(site)/studio/sign-in/page.tsx` — the email and password `<input>`s (these have `outline-none focus:shadow-comic-sm`; add the ring group so keyboard focus is visible).

- [ ] **Step 2: Verify + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add "app/(site)/error.tsx" "app/(site)/not-found.tsx" components/home/faq.tsx "app/(site)/studio/sign-in/page.tsx"
git commit -m "fix(a11y): visible focus rings on error/not-found/FAQ/studio sign-in controls

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final: Phase 5 wrap

- [ ] **Typecheck gate:** `npx tsc --noEmit` clean.
- [ ] **Targeted tests green:** `npm test -- tests/lib/studio-status.test.ts tests/lib/date-guard.test.ts`.
- [ ] **Mind maintenance:** re-stamp `studio` (confirm guard, in-flight feedback, hints, past-date guard, photo alt) and `auth-gating` (notes-dialog focus trap) and `app-shell`/`homepage` (global focus rings on error/not-found/FAQ — confirm which zone owns `error.tsx`/`not-found.tsx`/`faq.tsx` and re-stamp that one) to HEAD; `npm run mind`; commit.

## Self-review notes (author)
- **Spec coverage (Phase 5):** confirm-guard → Task 1; in-flight feedback → Task 2; studio hints → Task 4; past-date guard → Task 3; photo alt → Task 5; notes focus-trap → Task 6; focus-ring gaps → Task 7. All seven covered.
- **Placeholder scan:** none — full helper code + exact class strings + concrete edit instructions. The two structural edits (workflow-card confirm, order-notes focus trap) give the exact code to add and say to read the file first to place it precisely.
- **Type consistency:** `isDestructiveStatus(status: string): boolean` and `isPastDate(value, todayISO): boolean` defined once and used in their components.
- **Honest testing:** UI/a11y tasks without a unit seam are inspection/tsc-verified with the reason stated up front; the notes-dialog e2e is explicitly `test.skip` (not a fake pass) when no auth lane is available, deferring to inspection / a Layer-B run.
