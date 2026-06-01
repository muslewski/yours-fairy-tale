# The Series — premium, app-delivered personalized series

**Date:** 2026-06-01
**Status:** Approved (brainstorming), ready for implementation plan

## Summary

Introduce a second, premium product alongside the single personalized video: **The Series** — a personalized animated series (roughly 20 episodes of an ongoing adventure starring the child), delivered through a dedicated **iOS & Android app**. It is **coming soon**: no purchase or pricing yet, just a teaser on the homepage and a detailed dedicated subpage with a **waitlist** email capture.

This is a front-end-only feature: a new homepage section, a new `/series` route, supporting components, and nav/footer wiring. No backend, no payments, no real app — the waitlist form is a decorative/client-only mock matching the existing newsletter pattern.

### Decisions locked in brainstorming

- **Commercial model:** flexible — at launch the customer can choose an ongoing **membership** (new episodes drop over time in the app) **or** a **one-time purchase** (own the whole series). The page presents both as "two ways to watch."
- **Pricing:** **none shown yet.** Pure teaser. Use a "final pricing shared at launch" line instead of numbers.
- **Main action:** **Join the waitlist** — an email-capture form, front-end only (no backend wired), with a warm success state.
- **Product name:** labeled "The Series" in structure/nav; copy leans on the warm framing **"their very own show."** (Adjustable later.)
- **Placement:** the homepage teaser sits immediately **after the configurator (`#build`)** — the natural escalation from one video to the whole series.

## Brand & design constraints

- All user-facing copy goes through the **brand-voice skill** (calm, warm, keepsake, American English, sentence case, no comic SFX, no em-dashes, rare exclamation points, no emoji in prose).
- Colors via Tailwind `bg-brand-*`/`text-brand-*` or `var(--color-brand-*)` — never new hardcoded hex. Use `shadow-comic*` tokens.
- Motion from `motion/react`, guarded with `useReducedMotion()` for anything self-animating.
- Every CTA/link leads somewhere real (in-page anchor or route) — no `href="#"`.
- The premium band should feel visually distinct from the rest of the homepage (a deeper, richer treatment) while staying within the brand palette and comic-shadow system.

## Out of scope

- Any real backend, email storage, payments, subscription logic, or actual mobile app.
- The single-video product and its configurator (already shipped on `video-product-switch`).
- Blog, legacy/concept pages, design-system changes.

## Architecture

Follows the established subpage pattern (modeled on `app/blog/`): a route directory with its own `layout.tsx` that reuses `SiteNav` + `SiteFooter`, and a `page.tsx` that composes focused section components.

### Files

- **Create** `components/home/series-teaser.tsx` — homepage premium teaser band (client component; Motion). Section `id="series"`.
- **Create** `app/series/layout.tsx` — reuses `SiteNav` + `SiteFooter`, cream background, top padding for the fixed nav (mirrors `app/blog/layout.tsx`).
- **Create** `app/series/page.tsx` — composes the subpage sections; exports `metadata`.
- **Create** `components/series/series-hero.tsx` — hero with "Coming soon" badge, name, headline, subhead, waitlist CTA, app/phone visual.
- **Create** `components/series/series-sections.tsx` — the informational sections (What it is, A dedicated app, Two ways to watch, How it works). May be split further during planning if it grows; each section has one clear job.
- **Create** `components/series/waitlist-form.tsx` — `"use client"` email-capture form, front-end only, with a success state.
- **Modify** `components/home/site-nav.tsx` — add a "Series" nav link → `/series`.
- **Modify** `components/home/site-footer.tsx` — add a "The Series" link under the Explore column → `/series`.
- **Modify** `app/page.tsx` — render `<SeriesTeaser />` after `<Configurator />`.

## Homepage teaser section (`#series`)

A premium band, visually distinct (deep/gradient treatment within the palette):
- A rotated "Coming soon" sticker (comic-shadow).
- Short eyebrow + headline + one or two sentences positioning the series as the next step beyond a single video.
- An app/phone motif: a stylized phone frame showing the series, a row of episode dots (~20) hinting at the episode count, and quiet "iOS · Android" text (no real store badges).
- Primary CTA **"See what's coming →"** → `/series`. Secondary quiet link → the waitlist anchor on the subpage (e.g. `/series#waitlist`).
- Motion entrance, guarded by `useReducedMotion()`.

## The `/series` subpage

Sections, in order:

1. **Hero** — "Coming soon" badge; the name; a headline framing the child as the star of their own ongoing show; a supporting sentence; a primary waitlist CTA (scrolls to the waitlist section, anchor `#waitlist`); the app/phone visual.
2. **What it is** — a personalized animated series, ~20 episodes, the child as the recurring hero of an ongoing adventure. Concrete, sensory, keepsake-framed.
3. **A dedicated app** — available on iOS & Android; watch anywhere; new episodes appear as they're made; offline downloads; kid-safe and ad-free. Presented as a small feature grid (icon + label + one line each).
4. **Two ways to watch** — two cards side by side: **Membership** (new episodes drop over time) and **One-time** (own the whole series). **No prices.** A shared line below: "Final pricing shared at launch."
5. **How it works** — three steps: (1) tell us about your child, (2) we produce their series, (3) watch in the app as episodes arrive.
6. **Waitlist** (`id="waitlist"`) — the email-capture call to action with the `WaitlistForm`.

The page reuses `AnimatedHeading` and the comic-card/sticker visual language already used across the site, so it reads as the same brand at a premium tier.

## Waitlist form behavior

- `"use client"` component with local `useState`.
- Email `<input type="email">` + submit button. On submit (`onSubmit` with `preventDefault`), swap to a warm confirmation message (e.g. "You're on the list. We'll write the moment it's ready."). No network call, no persistence — this matches the existing decorative footer newsletter.
- Accessible: associated `<label>`, the success state announced (e.g. `role="status"`).
- Basic empty-email guard (don't show success on an empty submit); no heavy validation.

## Testing / verification

No unit-test runner exists (`package.json` has only `dev`/`build`/`start`). Verification is:
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeds; confirm `/series` appears as a prerendered route.
- Manual: homepage teaser renders after the configurator and links to `/series`; nav and footer "Series" links work; `/series` renders all sections; the waitlist form shows its success state on submit and guards empty input; reduced-motion disables self-animation.
- Brand-voice and dead-link checks: no comic SFX in prose, no `href="#"`, every CTA resolves.

## Branch / PR note

This builds on the video homepage, which currently lives on the unmerged `video-product-switch` branch. The series work branches off `video-product-switch` and its PR should target that branch (stacked PR), or `video-product-switch` is merged to `main` first. This keeps each PR's diff scoped to its own feature.
