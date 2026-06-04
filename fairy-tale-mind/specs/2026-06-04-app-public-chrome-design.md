# /app gets the public nav + footer — design

> **Status:** approved 2026-06-04.

**Goal:** Make the gated `/app` dashboard feel like part of the site by giving it
the public `SiteNav` + `SiteFooter`, instead of its own bare chrome.

## Changes

1. **`SiteNav` gains a `signedIn?: boolean` prop** (default `false`).
   - `signedIn` → the right "Sign in" button becomes **"My account"** (→ `/app/profile`,
     where sign-out lives). The "Start! ⚡" CTA (→ `/#build`) stays — a returning
     customer can order another video. Center links unchanged.
   - default (public pages) → unchanged (`Sign in` + `Start! ⚡`).
2. **`app/(app)/app/layout.tsx`** keeps its authoritative session gate, but now renders
   the marketing chrome around the children (mirrors `/series`, `/contact`):
   `<SiteNav signedIn />` + `<main className="min-h-screen bg-brand-cream pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">{children}</main>` + `<SiteFooter />`.
3. **Dashboard + profile pages** (`app/(app)/app/page.tsx`, `app/(app)/app/profile/page.tsx`)
   drop their own `<main className="min-h-screen bg-brand-cream px-6 py-16">` wrapper and
   become a content `<div className="mx-auto max-w-2xl px-6">…</div>` — the layout main now
   owns the background, the fixed-nav clearance, and the footer.
4. **Drop the dashboard header's "Profile" link** (the nav's "My account" covers it).

## Notes / invariants preserved
- The gate is unchanged: `getCustomerSession()` → redirect to `/sign-in` when absent.
  `/app` stays fully protected.
- Footer `waveFrom` defaults to `cream`, matching the dashboard background.
- The nav is `"use client"`; the `signedIn` prop is passed from the server layout.

## Out of scope
- Pre-existing nav issues (the placeholder "Matieniatus" label; "Home"/"Contact" →
  `/#top` rather than real routes) — not touched here.

## Verify
- `npx tsc --noEmit` 0; `npm run build` succeeds.
- Browser: sign in, load `/app` — floating nav with "My account" + "Start", dashboard
  content below it, footer at the bottom; `/app/profile` likewise. Screenshot.
- e2e dashboard Layer B still passes (it asserts dashboard copy, which remains).
