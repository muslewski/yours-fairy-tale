# Preloader — Yours Fairy Tale

**Date:** 2026-06-02
**Status:** Approved (design), ready for implementation plan

## Goal

Add a first-impression "storybook curtain" preloader to the live site, ported from
the shared preloader system already used across sibling repos (nexarplus, venoart,
fadok, psylesny-zaulek, pol-med-v4), adapted to the Yours Fairy Tale brand.

## Behavior

- A **cream splash** covers the page from the very first paint (SSR-visible), so the
  user never sees a flash of page content before the splash appears.
- The colorful `public/logo.png` sits centered with a short **tagline** beneath it.
- After **~1800 ms** the splash leaves via the **curtain** variant: two cream halves
  part left/right, revealing the site. The logo + tagline fade out in sync with the
  parting curtain.
- Plays **once per browser session, site-wide**: the first page the user lands on
  shows it; a `sessionStorage` flag then suppresses it for the rest of that session
  (regardless of which page they entered on or navigate to).
- **Skipped entirely — no flash —** when:
  - the user prefers reduced motion (`prefers-reduced-motion: reduce`), or
  - the user agent is a known search-engine crawler
    (Googlebot, bingbot, YandexBot, DuckDuckBot, Slurp, Baiduspider).

## Visual decisions (locked during brainstorming)

| Decision | Choice |
|----------|--------|
| Exit animation | **Curtain** (two halves part L/R — reads like a stage curtain / book opening) |
| Splash background | **Cream paper** (`--color-brand-cream`, `#fff9ee`) — all logo colors read cleanly |
| Brand mark | The real colorful `logo.png` (it *is* the wordmark — no separate text wordmark) |
| Tagline | Yes, one short line beneath the logo |
| Scope | Whole site, once per session |
| Code shape | Port the shared multi-variant system (parity with other repos) |

## Architecture — three touch-points

### 1. `components/react-bits/preloader.tsx` (new)

The multi-variant animation component, ported from
`nexarplus/src/components/react-bits/preloader.tsx` essentially verbatim.

- Keep **all five variants** (`stairs | percentage | circle | slide | curtain`) and
  the full prop surface, so the variant can be changed later without re-porting.
- **Only change from source:** the `cn` import resolves to `@/lib/utils` (which
  already exports `cn` via clsx + tailwind-merge). The `@/*` → `./*` alias is
  already configured in `tsconfig.json`.
- `"use client"`, imports `motion`, `AnimatePresence` from `motion/react`
  (`motion ^12.40` is installed).

### 2. `components/site-preloader.tsx` (new)

The fairy-tale gate wrapper. Kebab-case filename to match existing component
convention (`site-nav.tsx`, `series-teaser.tsx`). Adapted from
`nexarplus/src/components/SitePreloader.tsx`. Responsibilities:

- **SSR-visible-by-default:** `useState(true)` for `visible`, `useState(true)` for
  `loading`. SSR renders the overlay so it covers content from the first paint.
- **Session gate:** a single global `sessionStorage` key (`yft-preloader`), **not**
  per-route — scope is whole-site-once. On mount: if the key is set, dismiss
  immediately; otherwise set it and run the timed lifecycle.
- **Reduced-motion skip:** if `matchMedia("(prefers-reduced-motion: reduce)")`
  matches, set `visible=false` and render nothing (no fade, no flash).
- **Crawler skip:** if `navigator.userAgent` matches the crawler regex above,
  `visible=false`.
- **Lifecycle:** when none of the skips apply, `setTimeout(() => setLoading(false),
  duration)` triggers the curtain exit; the underlying `Preloader`'s `onComplete`
  sets `visible=false`.
- **Brand overlay:** a centered flex column rendered above the `Preloader`, holding:
  - `next/image` of `/logo.png` (`priority`, responsive width ~`h-24 w-auto` on
    mobile up to ~`h-32`/`h-40` on desktop — exact sizing tuned in implementation;
    logo source is 1024×1024), `alt=""` (decorative — the region is labeled).
  - the **tagline** in `text-brand-deep`.
  - wrapped in `AnimatePresence`; fades (`opacity` + slight `scale`) on exit, in
    sync with the curtain panels leaving.
- **Defaults passed to `Preloader`:**
  - `variant="curtain"`
  - `bgColor="var(--color-brand-cream)"` (CSS variable, **never** a raw hex — per
    project design-system rule)
  - `duration={1800}`
  - `loadingText=""` (suppressed — our overlay renders logo + tagline instead, so
    the two never collide in the center)
  - `respectReducedMotion`, `reducedMotionFallback="fade"`
  - `position="fixed"`, `zIndex={9999}` (overlay at `z-[10000]`); the fixed nav is
    `z-50`, so the splash sits above everything.
  - `ariaLabel="Loading Yours Fairy Tale"`

### 3. `app/layout.tsx` (edit)

Mount `<SitePreloader />` as the **first child of `<body>`**, above `{children}`:

```tsx
<body className={...}>
  <SitePreloader />
  {children}
</body>
```

Root layout stays a server component; `SitePreloader` is `"use client"`, which is
valid as a child of a server layout. Site-wide mount = plays on whatever page the
user first enters.

## Copy (brand voice)

The tagline is user-facing copy, so it goes through the `brand-voice` skill during
implementation. Working default for the spec: **"Once upon your child."**
Alternate candidate: **"A story made just for them."** Final wording confirmed via
brand-voice before merge. Voice: calm, warm, keepsake-focused, speaks to the
parent/gift-giver; American English; no exclamation.

## Accessibility

- Splash region carries `role="status"` + `aria-label="Loading Yours Fairy Tale"`
  (provided by the underlying `Preloader`'s variant container).
- Logo image `alt=""` — decorative, because the region is already labeled and the
  logo is not load-bearing information.
- Reduced-motion users bypass the entire preloader (handled in the wrapper).

## Out of scope (YAGNI)

- No real asset-loading progress — it is a timed splash, not a load meter.
- No per-route replays — once per session, globally.
- No percentage counter / progress bar.
- No new dependencies (motion, clsx, tailwind-merge already present).
- No changes to the frozen concept/legacy pages or their archive behavior.

## Verification

- First load (fresh session / new tab): cream splash visible immediately, curtain
  parts after ~1.8s, content revealed; reload within the same session → no splash.
- Reduced-motion (OS setting or DevTools emulation): no splash, no flash of cream.
- Logo and tagline are centered and legible on the cream background; nav and content
  sit beneath the splash while it is up.
- `getComputedStyle` note: Tailwind v4 compiles `translate-*` to the native
  `translate` property, relevant only if testing motion via computed styles.
