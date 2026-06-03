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
depends: ["[[site-preloader]]", "[[section-waves]]"]
invariants: []
verifiedAt: f8eb4a2
---

## Purpose
The root layout (`app/layout.tsx`) registers fonts, wraps all pages with `[[site-preloader]]`, and mounts the fixed-pill nav and footer.
Sub-layouts for `/series` and `/blog` extend the shell with route-specific chrome.

The nav's right cluster holds two buttons: a secondary **Sign in** (white, outlined →
`/sign-in`, the returning-customer entry to `[[auth-gating]]`) and the primary **Start**
CTA (pink → `#build`). Sign in stays visible on mobile even though the center links
collapse, since this nav has no hamburger menu.

## Lineage
Seeded from the existing site at Mind setup.
