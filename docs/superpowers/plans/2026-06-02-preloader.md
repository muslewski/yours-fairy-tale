# Preloader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-impression "storybook curtain" preloader to the live site — a cream splash with the colorful logo + tagline that parts like a curtain after ~1.8s, playing once per browser session site-wide.

**Architecture:** Port the shared multi-variant `react-bits/preloader.tsx` animation component (verbatim) from the sibling `nexarplus` repo, then add a brand-specific `components/site-preloader.tsx` wrapper that gates it (SSR-visible default, once-per-session, reduced-motion + crawler skips) and overlays the logo + tagline. Mount the wrapper as the first child of `<body>` in `app/layout.tsx`.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Motion (`motion/react`) · Tailwind CSS v4. No new dependencies — `motion ^12.40`, `clsx`, `tailwind-merge` are already installed.

> **Testing note — read before starting.** This repo has **no unit-test harness** (no vitest/jest/playwright, no test scripts, no test files) — it is a visually-verified Next.js marketing site. Per the project's existing pattern and CLAUDE.md (which takes precedence), we do **not** introduce a test framework for this feature. The verification gates are: (1) `npm run build` must pass (Next 16 runs typecheck + lint + compile), and (2) browser checks of the observable behavior. Each task ends with the relevant gate + a commit.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `components/react-bits/preloader.tsx` | Generic multi-variant loading-overlay animation (stairs/percentage/circle/slide/curtain). Pure presentational, no app knowledge. | **Create** (verbatim port) |
| `components/site-preloader.tsx` | Brand gate + overlay: decides whether to play, supplies fairy-tale defaults (curtain, cream, duration), renders the logo + tagline on top. | **Create** |
| `app/layout.tsx` | Mounts `<SitePreloader />` as the first child of `<body>` so it covers content from first paint, site-wide. | **Modify** |

---

## Task 1: Port the multi-variant Preloader component

**Files:**
- Create: `components/react-bits/preloader.tsx` (copied from `/Users/muslewski/Documents/Repozytoria/nexarplus/src/components/react-bits/preloader.tsx`)

The source file already imports `cn` from `@/lib/utils` and that alias (`@/*` → `./*`) plus `lib/utils.ts` both exist in this repo, so the copy works **with no edits**.

- [ ] **Step 1: Copy the component verbatim**

```bash
mkdir -p components/react-bits
cp /Users/muslewski/Documents/Repozytoria/nexarplus/src/components/react-bits/preloader.tsx \
   components/react-bits/preloader.tsx
```

- [ ] **Step 2: Confirm the only external import resolves in this repo**

Run:
```bash
head -6 components/react-bits/preloader.tsx
grep -n "export function cn" lib/utils.ts
```
Expected: line 5 of the component is `import { cn } from "@/lib/utils";`, and `lib/utils.ts` exports `cn`. No edits needed. (If the copy failed because the sibling repo path differs on this machine, locate it with `find /Users/muslewski/Documents/Repozytoria -path '*react-bits/preloader.tsx' -not -path '*/node_modules/*'` and re-copy.)

- [ ] **Step 3: Typecheck/compile gate**

Run: `npm run build`
Expected: build succeeds. The new file compiles; `Preloader` is exported as default. (A successful build is the gate — there is no unit test.)

- [ ] **Step 4: Commit**

```bash
git add components/react-bits/preloader.tsx
git commit -m "Add react-bits multi-variant Preloader (ported from nexarplus)"
```

---

## Task 2: Create the SitePreloader brand wrapper

**Files:**
- Create: `components/site-preloader.tsx`

This is the only fairy-tale-specific logic. It gates playback and renders the brand overlay. The logo IS the wordmark, so there is no separate text wordmark — just the logo image and the tagline.

- [ ] **Step 1: Write the wrapper**

Create `components/site-preloader.tsx` with exactly this content:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Preloader from "@/components/react-bits/preloader";

/**
 * First-visit-per-session site preloader for Yours Fairy Tale.
 *
 * SSR-visible by default: the overlay is rendered in the visible state so it
 * covers page content from the very first paint — no flash of content before
 * the splash appears. On client mount the gate decides whether to keep playing
 * or dismiss immediately (already-played this session / reduced motion / crawler).
 *
 * Scope is whole-site, once-per-session: a single global sessionStorage key,
 * not keyed on pathname, so it plays on whatever page the user first lands on
 * and then stays out of the way for the rest of the session.
 */

const STORAGE_KEY = "yft-preloader";
const DEFAULT_DURATION_MS = 1800;
const CRAWLER_RE = /Googlebot|bingbot|YandexBot|DuckDuckBot|Slurp|Baiduspider/i;

export type SitePreloaderProps = {
  /** Short tagline under the logo. Keep it warm and brief — it fades quickly. */
  loadingText?: string;
  /** Splash duration in ms before the curtain parts. */
  duration?: number;
};

export function SitePreloader({
  loadingText = "Once upon your child.",
  duration = DEFAULT_DURATION_MS,
}: SitePreloaderProps) {
  // Default state: VISIBLE so SSR renders the overlay over the page.
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reduced-motion users skip entirely — no splash, no fade, no flash.
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(false);
      return;
    }

    // Known search-engine crawlers skip.
    if (
      typeof navigator !== "undefined" &&
      CRAWLER_RE.test(navigator.userAgent)
    ) {
      setVisible(false);
      return;
    }

    // Whole-site, once-per-session gate (single global key).
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, "1");

    const t = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!visible) return null;

  return (
    <>
      <Preloader
        loading={loading}
        variant="curtain"
        position="fixed"
        duration={duration}
        // Our overlay renders the logo + tagline; suppress the Preloader's own
        // text so the two never collide in the center.
        loadingText=""
        respectReducedMotion
        reducedMotionFallback="fade"
        ariaLabel="Loading Yours Fairy Tale"
        bgColor="var(--color-brand-cream)"
        zIndex={9999}
        onComplete={() => setVisible(false)}
        className="!h-auto"
      />

      {/* Brand stack: logo + tagline, centered. AnimatePresence syncs the exit
          with the curtain parting so they leave together. */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="preloader-brand"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-0 z-[10000] flex items-center justify-center px-6"
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-5 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={260}
                  height={260}
                  priority
                  className="h-28 w-auto select-none sm:h-36"
                />
              </motion.div>
              {loadingText && (
                <span className="font-[family-name:var(--font-fraunces)] text-lg italic text-brand-deep/70 sm:text-xl">
                  {loadingText}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 2: Compile gate**

Run: `npm run build`
Expected: build succeeds. `SitePreloader` is exported, all props typecheck against `PreloaderProps`, no unused-import or lint errors.

- [ ] **Step 3: Commit**

```bash
git add components/site-preloader.tsx
git commit -m "Add SitePreloader brand wrapper (curtain + cream, once/session)"
```

---

## Task 3: Mount the preloader site-wide in the root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add the import**

In `app/layout.tsx`, add this import below the existing font/CSS imports near the top (after `import "./globals.css";`):

```tsx
import { SitePreloader } from "@/components/site-preloader";
```

- [ ] **Step 2: Render it as the first child of `<body>`**

Change the body so `<SitePreloader />` renders before `{children}`. The block currently reads:

```tsx
      <body
        className={`${fredoka.variable} ${quicksand.variable} ${fraunces.variable} min-h-full antialiased`}
      >
        {children}
      </body>
```

Replace it with:

```tsx
      <body
        className={`${fredoka.variable} ${quicksand.variable} ${fraunces.variable} min-h-full antialiased`}
      >
        <SitePreloader />
        {children}
      </body>
```

(The root layout stays a Server Component; `SitePreloader` is a `"use client"` component, which is valid as a child of a Server Component.)

- [ ] **Step 3: Compile gate**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "Mount SitePreloader site-wide in root layout"
```

---

## Task 4: Brand-voice the tagline + browser verification

**Files:**
- Modify (if brand-voice changes the wording): `components/site-preloader.tsx` (the `loadingText` default)

- [ ] **Step 1: Lock the tagline via brand-voice**

Invoke the `brand-voice` skill (`.claude/skills/brand-voice/SKILL.md`) to confirm or choose the tagline. Candidates: `"Once upon your child."` (current default) and `"A story made just for them."`. Pick one that fits the keepsake tone (calm, warm, speaks to the parent, no exclamation). If it differs from the current default, update the `loadingText` default in `components/site-preloader.tsx` and re-run `npm run build`.

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: dev server on `http://localhost:3000`.

- [ ] **Step 3: Verify first-load splash (fresh session)**

Open `http://localhost:3000` in a **new** browser tab (or incognito — sessionStorage must be empty). Observe, in order:
1. The cream splash covers the page **immediately** — no flash of homepage content first.
2. The colorful logo + tagline are centered and legible on the cream background.
3. After ~1.8s the cream splits into two halves that part left/right (curtain), revealing the homepage; the logo + tagline fade out as it parts.
4. The fixed nav and page content sit beneath the splash while it is up (splash is on top).

- [ ] **Step 4: Verify once-per-session suppression**

In the **same tab**, reload the page (Cmd/Ctrl-R).
Expected: **no splash** — content appears directly (sessionStorage key `yft-preloader` is set). Open a fresh incognito window → splash plays again (new session).

- [ ] **Step 5: Verify reduced-motion skip (no flash)**

In Chrome DevTools: Command Menu → "Show Rendering" → set **Emulate CSS prefers-reduced-motion: reduce**. Open the site in a fresh session (new incognito tab, or clear sessionStorage via `sessionStorage.clear()` then reload).
Expected: **no splash at all** and **no flash of cream** — the page renders directly. (The wrapper returns `null` before the overlay paints.)

- [ ] **Step 6: Final build gate + commit any tagline change**

Run: `npm run build`
Expected: build succeeds.

```bash
git add components/site-preloader.tsx
git commit -m "Finalize preloader tagline (brand-voice)"
```

(If brand-voice kept the default wording, skip the commit — nothing changed.)

---

## Self-Review (completed during planning)

- **Spec coverage:** curtain exit (Tasks 1–2), cream splash via `var(--color-brand-cream)` (Task 2), logo + tagline overlay (Task 2), once-per-session site-wide via global key + layout mount (Tasks 2–3), reduced-motion + crawler skips (Task 2, verified Task 4), no raw hex / CSS-var rule honored (Task 2), brand-voice tagline (Task 4), accessibility `role`/`aria-label` (inherited from ported `Preloader`) + decorative `alt=""` (Task 2). All spec sections map to a task.
- **Placeholder scan:** no TBDs; every code step shows complete code; the verbatim port is a real `cp` of an existing file, not a placeholder.
- **Type consistency:** wrapper props (`variant="curtain"`, `bgColor`, `loadingText`, `duration`, `respectReducedMotion`, `reducedMotionFallback`, `ariaLabel`, `zIndex`, `onComplete`, `position`) all exist on `PreloaderProps` in the ported component. Default export `Preloader` matches the wrapper's `import Preloader from ...`.
