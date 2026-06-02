---
type: decision
summary: "The site preloader is SSR-visible, plays once per browser session, and is skipped (no flash) under reduced motion via CSS."
tags: [ux]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[site-preloader]]"]
sources: ["[[2026-06-02-preloader-design]]"]
decided: 2026-06-02
supersededBy: ""
---

## Context
A "storybook curtain" preloader was added to give a strong first impression on the
live site. Several UX constraints needed explicit decisions: when to show it, how
to avoid a flash-of-content before it renders, and what to do for users who have
requested reduced motion.

## Decision
- **SSR-visible default:** the preloader renders server-side so it's present from
  the very first paint — users never see a flash of page content before the cream
  splash appears.
- **Once per session:** a `sessionStorage` gate (key `yft-preloader`) ensures the
  animation only plays on the first page load of each browser session. Subsequent
  navigations skip it immediately.
- **Reduced motion:** the component uses `motion-reduce:hidden` (a CSS-only gate)
  so users with `prefers-reduced-motion` never see the overlay at all — no JS
  involvement, no flash.

## Why
SSR-visibility avoids the common "preloader pops in late" problem. Session gating
prevents the animation from becoming annoying on repeat visits. The CSS-only
reduced-motion path is the most reliable and zero-JS approach.

## Consequences
The `sessionStorage` key `yft-preloader` is an implicit contract — changing it
breaks the "once per session" behavior for users mid-session. Crawlers and bots
also skip the preloader (detected alongside reduced-motion in the component logic).
