---
type: zone
summary: "Nav, footer, root layout and fonts — the chrome wrapping every page."
tags: [infrastructure, layout]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[site-preloader]]", "[[section-waves]]"]
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
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
The root layout (`app/layout.tsx`) registers fonts, wraps all pages with `[[site-preloader]]`, and mounts the fixed-pill nav and footer.
Sub-layouts for `/series` and `/blog` extend the shell with route-specific chrome.

## Lineage
Seeded from the existing site at Mind setup.
