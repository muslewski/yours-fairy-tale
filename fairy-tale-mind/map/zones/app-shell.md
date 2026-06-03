---
type: zone
summary: "Nav, footer, root layout and fonts — the chrome wrapping every page."
tags: [infrastructure, layout]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[site-preloader]]", "[[section-waves]]", "[[auth-gating]]"]
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "app/layout.tsx"
    - "app/series/layout.tsx"
    - "app/blog/layout.tsx"
    - "components/home/site-nav.tsx"
    - "components/home/site-footer.tsx"
    - "components/motion/stagger.tsx"
depends: ["[[site-preloader]]", "[[section-waves]]"]
invariants:
  - rule: "Internal navigation uses next/link (client-side, no full reload) — never raw <a>/motion.a for in-app routes. Animated links wrap Link via motion.create(Link); StaggerItem supports as=\"link\"."
    enforcedBy: []
verifiedAt: 9dad9e2
---

## Purpose
The root layout (`app/layout.tsx`) registers fonts, wraps all pages with `[[site-preloader]]`, and mounts the fixed-pill nav and footer.
Sub-layouts for `/series` and `/blog` extend the shell with route-specific chrome.

The nav's right cluster holds two buttons: a secondary **Sign in** (white, outlined →
`/sign-in`, the returning-customer entry to `[[auth-gating]]`) and the primary **Start**
CTA (pink → `#build`). Sign in stays visible on mobile even though the center links
collapse, since this nav has no hamburger menu.

All internal nav uses **client-side `next/link`** (no full page reload). The animated nav
buttons (logo, Sign in, Start) are `motion.create(Link)`; the center links use the
`StaggerItem as="link"` variant (`components/motion/stagger.tsx`). Pure same-page fragment
links (`#build`, `#collections` with no leading slash) stay as plain anchors — they're
browser scrolls, not navigations.

## Lineage
Seeded from the existing site at Mind setup.
Nav converted from raw `<a>`/`motion.a` to `next/link` for client-side navigation
(2026-06-04).
