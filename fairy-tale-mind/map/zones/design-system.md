---
type: zone
summary: "Brand tokens, motion primitives, comic shadows, and the cn helper."
tags: [infrastructure, design]
status: active
created: 2026-06-02
updated: 2026-06-02
related: []
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "app/globals.css"
    - "lib/variants.ts"
    - "lib/utils.ts"
    - "components/motion/*"
depends: []
invariants:
  - rule: "Never hardcode hex — use brand tokens / CSS vars."
    enforcedBy: []
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
The single source of truth for the brand design language.
`app/globals.css` defines all color tokens, font variables, `shadow-comic` utilities, and scroll behaviour.
`lib/utils.ts` provides the `cn` class-merge helper; `lib/variants.ts` holds shared CVA variants.
`components/motion/` provides reusable Motion (Framer Motion) primitives.

## Lineage
Seeded from the existing site at Mind setup.
