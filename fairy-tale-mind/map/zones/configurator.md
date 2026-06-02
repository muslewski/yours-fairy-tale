---
type: zone
summary: "The personalized video builder — the homepage's conversion centerpiece (#build)."
tags: [surface, conversion]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[checkout]]"]
sources: []
owns:
  routes: []
  anchors: ["id:build"]
  globs:
    - "components/home/configurator.tsx"
depends: ["[[checkout]]"]
invariants: []
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
The `#build` section of the homepage — a step-by-step form where parents personalise their child's storybook.
It is the primary conversion point on the marketing site and feeds into `[[checkout]]`.

## Anchors & layout
Anchor: `id:build` (the section element in `components/home/configurator.tsx`).

## Lineage
Seeded from the existing site at Mind setup.
