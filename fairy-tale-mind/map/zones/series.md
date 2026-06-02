---
type: zone
summary: "The Series subpage and its waitlist."
tags: [surface, marketing]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[app-shell]]"]
sources: []
owns:
  routes: ["/series"]
  anchors: ["route:/series", "id:waitlist"]
  globs:
    - "app/series/page.tsx"
    - "components/series/*"
depends: ["[[app-shell]]"]
invariants: []
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
The `/series` route showcases the upcoming book series and captures early-access email addresses via the waitlist form.
Components live in `components/series/`; the sub-layout in `app/series/layout.tsx` is owned by `[[app-shell]]`.

## Anchors & layout
Section id: `waitlist` (the sign-up form section in `app/series/page.tsx`).

## Lineage
Seeded from the existing site at Mind setup.
