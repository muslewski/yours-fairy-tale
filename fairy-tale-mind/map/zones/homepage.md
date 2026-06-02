---
type: zone
summary: "The live marketing homepage — hero, categories grid, configurator, series teaser, FAQ, CTA. The page we build forward."
tags: [surface, marketing]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[configurator]]", "[[app-shell]]", "[[section-waves]]"]
sources: []
owns:
  routes: ["/"]
  anchors: ["route:/", "id:top", "id:collections", "id:faq", "id:series"]
  globs:
    - "app/page.tsx"
    - "components/home/hero.tsx"
    - "components/home/categories.tsx"
    - "components/home/cta-banner.tsx"
    - "components/home/faq.tsx"
    - "components/home/series-teaser.tsx"
    - "components/DotField.*"
depends: ["[[configurator]]", "[[app-shell]]", "[[section-waves]]"]
invariants:
  - rule: "Every CTA/nav link leads somewhere real (anchor or route), never href='#'."
    enforcedBy: []
verifiedAt: b5a6c612bdd69b4b1eb1b4f1c1894210a3aa4dcd
---

## Purpose
The home route `/`. Stacked full-bleed color sections separated by `[[section-waves]]`.
The conversion path runs to `#build` (the `[[configurator]]`) and `#collections`.

## Anchors & layout
Section ids: `top`, `collections`, `faq`, `series`. Components in `components/home/`.

## Invariants
See frontmatter; the href='#' rule is currently unenforced (see tech-debt).

## Lineage
Seeded from the existing site at Mind setup.
