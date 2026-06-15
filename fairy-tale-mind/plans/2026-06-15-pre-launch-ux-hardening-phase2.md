# Pre-launch UX Hardening — Phase 2 (Acquisition & checkout UX) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Any user-facing copy must clear the `brand-voice` skill; any section-divider change must clear the `section-waves` skill (both are project mandates in CLAUDE.md).

**Goal:** Close the acquisition/checkout experience gaps before real payments: a real post-success confirmation page, working mobile navigation, an honest "sample coming soon" section, a wired footer newsletter, no dead footer/nav links, and a Stripe call that fails gracefully.

**Architecture:** Six independent, separately-committable changes on the live homepage + checkout path. New public `/order-confirmed` route (own layout mirroring `contact/`); a mobile drawer in the existing nav; a new `#sample` homepage section; the footer form wired to the existing `/api/waitlist` path; footer/nav copy cleanup; one try/catch around the Stripe create call.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, Motion (`motion/react`), Better Auth client (`@/lib/auth-client`), Payload Local API + Resend (waitlist path), vitest, Playwright (Layer A).

**Spec:** `fairy-tale-mind/specs/2026-06-15-pre-launch-ux-hardening-design.md` (Phase 2).
**Branch:** `feat/pre-launch-ux-hardening` (checked out; Phase 1 already merged to local `staging`).

**Cross-phase note:** Spec Phase 2 item 1 says the confirmation page "clears the configurator draft (Phase 3) on mount." The draft does not exist yet (it's introduced in Phase 3). To respect YAGNI we do **not** add speculative draft-clearing here; Phase 3 will modify `/order-confirmed` to clear its own draft key. This is recorded in Task 1 so nothing is lost.

---

## Task 1: Post-success confirmation page (`/order-confirmed`)

**Files:**
- Modify: `lib/checkout.ts:66` (success_url)
- Create: `app/(site)/order-confirmed/layout.tsx`, `app/(site)/order-confirmed/page.tsx`
- Test: `tests/lib/checkout.test.ts` (new), `e2e/order-confirmed.spec.ts` (new, Layer A)

Today `success_url` sends paid buyers to `/app?session=...` — a gated route that bounces unauthenticated users to sign-in with no explanation, and the order may not exist yet (the webhook is async). The fix: a public, auth/DB-free confirmation page.

- [ ] **Step 1: Write the failing unit test for the success_url**

Create `tests/lib/checkout.test.ts`:
```ts
import { expect, test } from "vitest";

import { buildCheckoutSessionParams } from "@/lib/checkout";

const baseInput = {
  childName: "Mia",
  world: "bedtime" as const,
  length: "medium",
  detail: "basic",
  extraMinutes: 0,
  addOns: ["narration"],
  plotNote: "",
};

test("success_url points at the public /order-confirmed page with the session id", () => {
  const params = buildCheckoutSessionParams(baseInput, "https://example.com");
  expect(params.success_url).toBe(
    "https://example.com/order-confirmed?session={CHECKOUT_SESSION_ID}",
  );
});

test("cancel_url still returns to the configurator", () => {
  const params = buildCheckoutSessionParams(baseInput, "https://example.com");
  expect(params.cancel_url).toBe("https://example.com/#build");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/lib/checkout.test.ts`
Expected: FAIL — success_url is still `/app?session=...`.

- [ ] **Step 3: Change the success_url**

In `lib/checkout.ts:66`, replace:
```ts
    success_url: `${baseUrl}/app?session={CHECKOUT_SESSION_ID}`,
```
with:
```ts
    success_url: `${baseUrl}/order-confirmed?session={CHECKOUT_SESSION_ID}`,
```
(Leave the `{CHECKOUT_SESSION_ID}` literal and the explanatory comment above it intact.)

- [ ] **Step 4: Create the route layout** (mirrors `app/(site)/contact/layout.tsx`)

Create `app/(site)/order-confirmed/layout.tsx`:
```tsx
import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

export default function OrderConfirmedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-brand-cream pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 5: Create the page** (client component for the session-aware CTA; no DB, no `session` read required)

Create `app/(site)/order-confirmed/page.tsx`:
```tsx
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { authClient } from "@/lib/auth-client";

/**
 * Public post-checkout confirmation. Deliberately auth- and DB-free: Stripe
 * redirects here immediately after payment, but the order is created by the
 * async webhook a moment later, so this page must NOT depend on the order (or a
 * session) existing yet. It reassures, sets email expectations (incl. spam), and
 * routes the parent onward. The signed-in vs signed-out CTA is resolved
 * client-side via Better Auth, exactly like the nav.
 *
 * Phase 3 will additionally clear the configurator draft on mount (the draft
 * does not exist yet).
 */
export default function OrderConfirmedPage() {
  const reduce = useReducedMotion();
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  return (
    <section className="mx-auto max-w-2xl px-6 text-center sm:px-10">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          Order confirmed
        </span>
        <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
          Your order is confirmed
        </h1>
        <p className="mt-5 text-lg font-medium text-brand-deep/70">
          We&apos;ve emailed you a confirmation with a link to track your
          video&apos;s progress. It can take a minute or two to arrive.
        </p>
        <p className="mt-3 text-sm font-semibold text-brand-deep/55">
          Don&apos;t see it? Check your spam or promotions folder.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={signedIn ? "/app" : "/sign-in"}
            className="inline-flex items-center justify-center rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic active:translate-y-1 active:shadow-comic-sm"
          >
            {signedIn ? "Go to your orders" : "Sign in to track your order"}
          </Link>
          <Link
            href="/#build"
            className="inline-flex items-center justify-center rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic active:translate-y-1 active:shadow-comic-sm"
          >
            Create another
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 6: Write the Layer-A e2e test**

Create `e2e/order-confirmed.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("@layerA order-confirmed page reassures and sets email expectations", async ({
  page,
}) => {
  await page.goto("/order-confirmed?session=cs_test_123");
  await expect(
    page.getByRole("heading", { name: /your order is confirmed/i }),
  ).toBeVisible();
  await expect(page.getByText(/spam or promotions folder/i)).toBeVisible();
  // Signed-out visitor is routed to sign-in to track the order.
  await expect(
    page.getByRole("link", { name: /sign in to track your order/i }),
  ).toBeVisible();
});
```

- [ ] **Step 7: Run the tests**

Run: `npm test -- tests/lib/checkout.test.ts` → PASS (2).
Run: `npm run test:e2e -- e2e/order-confirmed.spec.ts` → PASS (or, if no browser in this sandbox: confirm the route renders by `npx tsc --noEmit` clean + code inspection; CI runs the spec).

- [ ] **Step 8: Commit**
```bash
git add lib/checkout.ts "app/(site)/order-confirmed" tests/lib/checkout.test.ts e2e/order-confirmed.spec.ts
git commit -m "feat(checkout): public /order-confirmed success page (spam note + onward CTA)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Mobile navigation drawer

**Files:**
- Modify: `components/home/site-nav.tsx`
- Test: `e2e/mobile-nav.spec.ts` (new, Layer A)

Today the nav links are `hidden md:flex` with no mobile equivalent — on phones there is no way to reach Series / Journal / Contact. Add a hamburger (shown `md:hidden`) that opens a Motion drawer exposing the full nav + Sign in + Start.

- [ ] **Step 1: Write the failing Layer-A test**

Create `e2e/mobile-nav.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

test("@layerA mobile nav opens a drawer with the full menu", async ({ page }) => {
  await page.goto("/");
  // The desktop nav is hidden at this width; a menu button is present.
  const toggle = page.getByRole("button", { name: /menu/i });
  await expect(toggle).toBeVisible();
  await toggle.click();
  const drawer = page.getByRole("dialog", { name: /menu/i });
  await expect(drawer.getByRole("link", { name: "Contact" })).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Series" })).toBeVisible();
  // Closes again.
  await page.getByRole("button", { name: /close menu/i }).click();
  await expect(page.getByRole("dialog", { name: /menu/i })).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- e2e/mobile-nav.spec.ts`
Expected: FAIL — no menu button exists. (If no browser in sandbox: note it; CI runs it.)

- [ ] **Step 3: Add the drawer to `site-nav.tsx`**

`site-nav.tsx` is already `"use client"`. Add `useState` and `AnimatePresence` to the imports:
```tsx
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
```
Inside `SiteNav`, after `const signedIn = ...`, add:
```tsx
  const [menuOpen, setMenuOpen] = useState(false);
```
Add the hamburger button into the right-hand `<div className="flex shrink-0 items-center gap-2">`, as the FIRST child (so it sits before Sign in / Start), visible only below `md`:
```tsx
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded-lg border-[3px] border-brand-deep bg-white p-2 text-brand-deep shadow-comic-sm md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
```
Then, immediately after the closing `</motion.header>` (still inside the outer wrapper `<div>`), add the drawer:
```tsx
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-brand-cream px-6 py-6 md:hidden"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="inline-flex items-center justify-center rounded-lg border-[3px] border-brand-deep bg-white p-2 text-brand-deep shadow-comic-sm"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 5l10 10M15 5L5 15" />
                  </svg>
                </button>
              </div>
              <nav className="mt-6 flex flex-col gap-2">
                {NAV.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-lg font-bold text-brand-deep hover:bg-brand-yellow"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href={signedIn ? "/app/profile" : "/sign-in"}
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 rounded-xl border-[3px] border-brand-deep bg-white px-4 py-3 text-lg font-bold text-brand-deep shadow-comic-sm"
                >
                  {signedIn ? "My account" : "Sign in"}
                </Link>
                <Link
                  href="/#build"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl border-[3px] border-brand-deep bg-brand-pink px-4 py-3 text-lg font-bold text-white shadow-comic-sm"
                >
                  Start
                </Link>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
```

- [ ] **Step 4: Run the test** → PASS (or note sandbox + verify by inspection; CI runs it).

- [ ] **Step 5: Commit**
```bash
git add components/home/site-nav.tsx e2e/mobile-nav.spec.ts
git commit -m "feat(nav): mobile hamburger drawer (reduced-motion guarded)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Sample section (`#sample`) below the hero + retarget the sample CTAs

**Files:**
- Create: `components/home/sample.tsx`
- Modify: `app/(site)/page.tsx` (insert the section), `components/home/hero.tsx:119-126`, `components/home/cta-banner.tsx:45-50`
- Test: `e2e/sample-section.spec.ts` (new, Layer A)

The hero + CTA-banner "Watch a sample" / "Watch samples" buttons point at `#collections` (the wrong target). Add a real `#sample` section directly below the hero showing a calm "coming soon" placeholder, and point the CTAs at it. The placeholder swaps to a real player later via one source constant.

**Wave colors (consult the `section-waves` skill before editing `page.tsx`):** Hero is `yellow`, Categories is `cream`, and the existing divider between them is `<SectionWave from="yellow" to="cream" />`. Make the Sample section `cream` so it sits *after* that existing wave with **no new divider needed** (Sample `cream` → Categories `cream` are the same color). Net change to `page.tsx`: insert `<Sample />` between the existing `<SectionWave from="yellow" to="cream" />` and `<Categories />`. No wave is added or edited.

- [ ] **Step 1: Write the failing Layer-A test**

Create `e2e/sample-section.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("@layerA sample section exists and the hero CTA targets it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#sample")).toBeVisible();
  await expect(page.getByText(/sample.*coming soon/i)).toBeVisible();
  const cta = page.getByRole("link", { name: /watch a sample/i }).first();
  await expect(cta).toHaveAttribute("href", "#sample");
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- e2e/sample-section.spec.ts`
Expected: FAIL — no `#sample`, CTA points at `#collections`. (Sandbox: note it; CI runs it.)

- [ ] **Step 3: Create the Sample section**

Create `components/home/sample.tsx`:
```tsx
import { AnimatedHeading } from "@/components/motion/animated-heading";

/**
 * The sample-film section, first thing below the hero. Until the real sample
 * video is provided, it shows a calm "coming soon" placeholder. To go live,
 * set SAMPLE_VIDEO_SRC to the video URL — the placeholder is replaced by an
 * inline <video> automatically; nothing else changes.
 */
const SAMPLE_VIDEO_SRC: string | null = null;

export function Sample() {
  return (
    <section id="sample" className="bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
        <span className="inline-block rotate-[-1deg] rounded-lg border-[3px] border-brand-deep bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          See a sample
        </span>
        <AnimatedHeading
          as="h2"
          text="Watch a sample film"
          className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
        />
        <div className="mt-10 overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg">
          {SAMPLE_VIDEO_SRC ? (
            <video
              src={SAMPLE_VIDEO_SRC}
              controls
              playsInline
              className="aspect-video w-full bg-brand-deep"
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-brand-deep text-white">
              <span className="text-lg font-black uppercase tracking-wide">
                Sample coming soon
              </span>
              <span className="max-w-md text-sm font-medium text-white/70">
                We&apos;re finishing our first sample film. It will live here, ready
                to watch, very soon.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Insert it on the homepage**

In `app/(site)/page.tsx`, add the import alongside the other home imports:
```tsx
import { Sample } from "@/components/home/sample";
```
Then change:
```tsx
        <Hero />
        <SectionWave from="yellow" to="cream" />
        <Categories />
```
to:
```tsx
        <Hero />
        <SectionWave from="yellow" to="cream" />
        <Sample />
        <Categories />
```

- [ ] **Step 5: Retarget the CTAs (standardize copy to "Watch a sample")**

In `components/home/hero.tsx:119-126`, change `href="#collections"` to `href="#sample"` (keep the rest of the `<motion.a>` and the "Watch a sample" label).

In `components/home/cta-banner.tsx:45-50`, change `href="#collections"` to `href="#sample"` and the label `Watch samples` to `Watch a sample` (brand-voice: match the hero exactly).

- [ ] **Step 6: Run the test** → PASS (or note sandbox; CI runs it). Also `grep -rn "#collections" components/home/hero.tsx components/home/cta-banner.tsx` returns nothing.

- [ ] **Step 7: Commit**
```bash
git add components/home/sample.tsx "app/(site)/page.tsx" components/home/hero.tsx components/home/cta-banner.tsx e2e/sample-section.spec.ts
git commit -m "feat(home): #sample section below hero (coming-soon placeholder) + retarget sample CTAs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire the footer newsletter form

**Files:**
- Modify: `lib/waitlist.ts` (accept an optional `source`), `components/home/site-footer.tsx` (handler + states)
- Test: `tests/waitlist/waitlist.test.ts` (extend — source passthrough), `e2e/footer-newsletter.spec.ts` (new, Layer A)

Today the footer email form is a native `<form>` with no handler — submitting reloads the page and the signup is lost. Wire it to the existing `/api/waitlist` path (Payload + non-fatal Resend), tagging the source as `footer`.

- [ ] **Step 1: Write the failing unit test (source passthrough)**

`source` is a free-text field on the `waitlist` collection. Add to `tests/waitlist/waitlist.test.ts` (it already boots Payload + seeds; mirror its existing `submitWaitlistSignup` tests):
```ts
test("submitWaitlistSignup records the provided source", async () => {
  const email = `footer-${Date.now()}@example.com`;
  const res = await submitWaitlistSignup({ email, source: "footer" });
  expect(res.ok).toBe(true);

  const payload = await getPayloadClient();
  const found = await payload.find({
    collection: "waitlist",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  expect(found.docs[0]?.source).toBe("footer");
});
```
(Match the file's existing imports for `submitWaitlistSignup` and `getPayloadClient`; if the file lacks `getPayloadClient`, import it from `@/lib/payload`. If the file already cleans up created rows in an `afterAll`, add this email to that cleanup list.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/waitlist/waitlist.test.ts -t "provided source"`
Expected: FAIL — `source` is hardcoded to `"series"`, so it won't be `"footer"`.

- [ ] **Step 3: Accept an optional source in `lib/waitlist.ts`**

In the `WaitlistInput` interface, add the field:
```ts
export interface WaitlistInput {
  email?: string;
  /** Honeypot — must be empty. */
  company?: string;
  /** Where the signup came from (e.g. "series", "footer"). Defaults to "series". */
  source?: string;
}
```
In `submitWaitlistSignup`, change the create call's data from `source: "series"` to a sanitized passthrough. Just before the `payload.create`, add:
```ts
  const source = (input.source ?? "series").trim().slice(0, 64) || "series";
```
and use it:
```ts
    await payload.create({
      collection: "waitlist",
      data: { email: v.email, source },
      overrideAccess: true,
    });
```
(The `/api/waitlist` route already forwards the whole body to `submitWaitlistSignup`, so no route change is needed — `source` flows through.)

- [ ] **Step 4: Wire the footer form** (`site-footer.tsx` is already `"use client"`)

Add imports at the top of `components/home/site-footer.tsx`:
```tsx
import { useState, type FormEvent } from "react";
```
Inside the `SiteFooter` component body, add state:
```tsx
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");

  async function handleNewsletter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setStatus(res.ok && data.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }
```
Replace the newsletter `<form className="mt-7 max-w-sm">` block (the one with `#footer-email`) with a controlled, handled version:
```tsx
        <form className="mt-7 max-w-sm" onSubmit={handleNewsletter}>
          <label
            htmlFor="footer-email"
            className="text-sm font-black uppercase tracking-widest text-brand-yellow"
          >
            A little note now and then
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="footer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-xl border-[3px] border-white bg-white px-4 py-3 text-sm font-semibold text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-4 focus:ring-brand-pink/50"
            />
            <button
              type="submit"
              disabled={status === "loading" || status === "sent"}
              className="shrink-0 rounded-xl border-[3px] border-white bg-brand-pink px-5 py-3 text-sm font-black uppercase text-white transition-transform duration-150 active:translate-y-0.5 disabled:opacity-70"
            >
              {status === "sent" ? "Done" : status === "loading" ? "…" : "Join"}
            </button>
          </div>
          {status === "sent" ? (
            <p role="status" className="mt-2 text-xs font-semibold text-brand-yellow">
              You&apos;re on the list. Thanks for joining us.
            </p>
          ) : status === "error" ? (
            <p role="alert" className="mt-2 text-xs font-semibold text-white/70">
              That didn&apos;t go through. Please try again in a moment.
            </p>
          ) : (
            <p className="mt-2 text-xs font-semibold text-white/45">
              Occasional updates and new collections. No spam, ever.
            </p>
          )}
        </form>
```

- [ ] **Step 5: Write the Layer-A e2e test**

Create `e2e/footer-newsletter.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("@layerA footer newsletter posts the email and confirms", async ({ page }) => {
  let posted: unknown = null;
  await page.route("**/api/waitlist", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/");
  await page.locator("#footer-email").fill("ada@example.com");
  await page.locator("#footer-email").press("Enter");

  await expect(page.getByRole("status")).toContainText(/on the list/i);
  expect(posted).toMatchObject({ email: "ada@example.com", source: "footer" });
});
```

- [ ] **Step 6: Run the tests**

Run: `npm test -- tests/waitlist/waitlist.test.ts` → PASS.
Run: `npm run test:e2e -- e2e/footer-newsletter.spec.ts` → PASS (or note sandbox; CI runs it).

- [ ] **Step 7: Commit**
```bash
git add lib/waitlist.ts components/home/site-footer.tsx tests/waitlist/waitlist.test.ts e2e/footer-newsletter.spec.ts
git commit -m "feat(footer): wire the newsletter form to the waitlist path (source=footer)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Footer dead links + nav CTA copy

**Files:**
- Modify: `components/home/site-footer.tsx` (the `COLUMNS` array), `components/home/site-nav.tsx:120`
- Test: `e2e/footer-links.spec.ts` (new, Layer A)

Several footer links point at `/#top` as a placeholder for pages that don't exist ("Our story", "Reviews", "Careers", "Gift cards"). Pre-launch, the honest move is to remove the fabricated ones and point "Track your order" at a real destination. Also fix the nav CTA copy ("Start! ⚡" → "Start") per brand-voice.

- [ ] **Step 1: Write the failing Layer-A test**

Create `e2e/footer-links.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("@layerA footer has no fabricated dead links; track-order is real", async ({ page }) => {
  await page.goto("/");
  // Fabricated destinations are gone.
  for (const name of ["Our story", "Reviews", "Careers", "Gift cards"]) {
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  }
  // Track your order points at sign-in (the real path to the orders area).
  await expect(
    page.getByRole("link", { name: /track your order/i }),
  ).toHaveAttribute("href", "/sign-in");
});

test("@layerA nav primary CTA is calm 'Start' (no exclamation/emoji)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Start", exact: true })).toBeVisible();
  await expect(page.getByText("Start! ⚡")).toHaveCount(0);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:e2e -- e2e/footer-links.spec.ts`
Expected: FAIL — the fabricated links still exist; CTA is still "Start! ⚡". (Sandbox: note it; CI runs it.)

- [ ] **Step 3: Clean up the footer `COLUMNS`**

In `components/home/site-footer.tsx`, change the `Support` and `Company` columns. Replace:
```tsx
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Contact us", href: "/contact" },
      { label: "Delivery", href: "/#faq" },
      { label: "Track your order", href: "/#top" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/#top" },
      { label: "Reviews", href: "/#top" },
      { label: "Gift cards", href: "/#build" },
      { label: "Careers", href: "/#top" },
    ],
  },
```
with (drop the fabricated Company column entirely; point "Track your order" at `/sign-in`):
```tsx
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Contact us", href: "/contact" },
      { label: "Delivery", href: "/#faq" },
      { label: "Track your order", href: "/sign-in" },
    ],
  },
```
(Keep the `Explore` column as-is. The footer now renders two columns; if the grid uses an explicit `sm:grid-cols-3`/`md:grid-cols-4` count that assumed three link columns, adjust it down by one so the remaining columns don't look stranded — verify the wrapping `<div>`'s grid classes after the edit and reduce the column count to match.)

- [ ] **Step 4: Fix the nav CTA copy**

In `components/home/site-nav.tsx:120`, change `Start! ⚡` to `Start`. (The mobile drawer from Task 2 already uses `Start`.)

- [ ] **Step 5: Run the test** → PASS (or note sandbox; CI runs it).

- [ ] **Step 6: Commit**
```bash
git add components/home/site-footer.tsx components/home/site-nav.tsx e2e/footer-links.spec.ts
git commit -m "fix(home): remove fabricated footer links, real track-order target, calm 'Start' CTA

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wrap the Stripe checkout call

**Files:**
- Modify: `app/api/stripe/checkout/route.ts:66`
- Test: `tests/stripe/checkout-route.test.ts` (new)

`stripe.checkout.sessions.create(params)` is unwrapped — a Stripe/network error becomes an unhandled 500 with a stack, not a clean response. Wrap it; return 502 on failure.

- [ ] **Step 1: Write the failing test**

Create `tests/stripe/checkout-route.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";

// Mock the Stripe client so create() throws — we are testing the route's error
// handling, not Stripe.
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockRejectedValue(new Error("Stripe is down")),
      },
    },
  },
}));

import { POST } from "@/app/api/stripe/checkout/route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/checkout error handling", () => {
  test("returns 502 (not an unhandled 500) when Stripe create throws", async () => {
    const res = await POST(
      postRequest({
        world: "bedtime",
        length: "medium",
        detail: "basic",
        extraMinutes: 0,
        addOns: ["narration"],
      }) as never,
    );
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBeTruthy();
  });
});
```
(Confirm `world: "bedtime"`, `length: "medium"`, `detail: "basic"` are valid selections so the request reaches the Stripe call — they match `tests/lib/checkout.test.ts`. If pricing rejects them, use a known-valid trio from `lib/pricing`.)

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/stripe/checkout-route.test.ts`
Expected: FAIL — the unwrapped `create` throw rejects the POST promise (no 502).

- [ ] **Step 3: Wrap the call**

In `app/api/stripe/checkout/route.ts`, replace:
```ts
  const session = await stripe.checkout.sessions.create(params);

  return NextResponse.json({ url: session.url }, { status: 200 });
```
with:
```ts
  let session;
  try {
    session = await stripe.checkout.sessions.create(params);
  } catch (err) {
    console.error("[checkout] Stripe session create failed:", err);
    return NextResponse.json(
      { error: "We couldn't start checkout just now. Please try again in a moment." },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url }, { status: 200 });
```

- [ ] **Step 4: Run the test** → PASS.

- [ ] **Step 5: Commit**
```bash
git add "app/api/stripe/checkout/route.ts" tests/stripe/checkout-route.test.ts
git commit -m "fix(checkout): wrap Stripe session create — return 502 on failure, not an unhandled 500

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final: Phase 2 wrap

- [ ] **Typecheck gate:** `npx tsc --noEmit` clean.
- [ ] **Targeted tests green:** `npm test -- tests/lib/checkout.test.ts tests/waitlist/waitlist.test.ts tests/stripe/checkout-route.test.ts` all pass.
- [ ] **Mind maintenance:** re-stamp `homepage` (sample section, CTA retarget, footer), `app-shell` (nav CTA copy, footer), `checkout` (success_url + Stripe wrap) zones to HEAD; if `footer-dead-links` debt is now fully closed, resolve it (tombstone/supersede per Ledger rules); `npm run mind`; commit the updated `map/index.md`.
- [ ] **Section-waves skill:** confirm it was consulted for the Task-3 homepage divider decision (no new wave was needed — Sample is `cream`, same as Categories).

## Self-review notes (author)
- **Spec coverage (Phase 2):** success page → Task 1; mobile nav → Task 2; sample section + CTAs → Task 3; footer newsletter → Task 4; footer dead links + nav copy → Task 5; wrap Stripe call → Task 6. All six covered.
- **Deferred (documented, not dropped):** the configurator-draft *clear* on `/order-confirmed` is Phase 3 (the draft doesn't exist yet); configurator form-persistence itself is Phase 3. Noted in Task 1.
- **Placeholder scan:** none — full before/after code, real copy (brand-voice checked: no em-dashes, sentence case, "Start" not "Start! ⚡"), exact paths/lines.
- **Type consistency:** `WaitlistInput.source?: string` added once and used in `submitWaitlistSignup`; `buildCheckoutSessionParams(input, baseUrl)` signature unchanged; footer/nav state types (`"idle"|"loading"|"sent"|"error"`) consistent with the waitlist form's pattern.
- **Open inputs:** real sample video (swap `SAMPLE_VIDEO_SRC`); footer grid column count may need a -1 after dropping the Company column (flagged inline in Task 5 Step 3).
