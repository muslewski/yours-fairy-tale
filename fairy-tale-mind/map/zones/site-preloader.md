---
type: zone
summary: "First-visit curtain splash, shown once per session."
tags: [ui, animation]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[app-shell]]"]
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "components/site-preloader.tsx"
    - "components/react-bits/preloader.tsx"
depends: []
invariants:
  - rule: "Reduced-motion users see no flash of the splash."
    enforcedBy: ["motion-reduce:hidden"]
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
An animated curtain shown once per browser session to new visitors.
Mounted in `[[app-shell]]`; uses `prefers-reduced-motion` to skip entirely for motion-sensitive users.

## Lineage
Seeded from the existing site at Mind setup.
