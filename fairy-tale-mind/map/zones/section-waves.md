---
type: zone
summary: "Wave dividers between differently-colored sections; the footer owns its entry wave."
tags: [ui, layout]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[design-system]]"]
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "components/home/section-wave.tsx"
depends: ["[[design-system]]"]
invariants:
  - rule: "The footer owns its own entry wave."
    enforcedBy: ["[[skill:section-waves]]"]
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
SVG wave shapes rendered at section boundaries to create a flowing visual transition between full-bleed colored blocks.
Consumed by `[[homepage]]`, `[[series]]`, and other surfaces. The footer is responsible for its own entry wave.

## Lineage
Seeded from the existing site at Mind setup.
