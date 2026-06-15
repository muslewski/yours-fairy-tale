---
type: zone
summary: "The live marketing homepage — hero, categories grid, configurator, series teaser, FAQ, CTA. The page we build forward."
tags: [surface, marketing]
status: active
created: 2026-06-02
updated: 2026-06-15
related: ["[[configurator]]", "[[app-shell]]", "[[section-waves]]"]
sources: []
owns:
  routes: ["/"]
  anchors: ["route:/", "id:top", "id:sample", "id:collections", "id:faq", "id:series"]
  globs:
    - "app/(site)/page.tsx"
    - "components/home/hero.tsx"
    - "components/home/sample.tsx"
    - "components/home/categories.tsx"
    - "components/home/cta-banner.tsx"
    - "components/home/faq.tsx"
    - "components/home/series-teaser.tsx"
    - "components/DotField.*"
depends: ["[[configurator]]", "[[app-shell]]", "[[section-waves]]"]
invariants:
  - rule: "Every CTA/nav link leads somewhere real (anchor or route), never href='#'."
    enforcedBy: []
  - rule: "The hero headline must not overflow on mobile: it scales fluidly (clamp) and wraps below lg; whitespace-nowrap is restored only at lg+. The character column moves above the headline on mobile (order-first) at a capped width, restored to the right column at lg."
    enforcedBy: []
verifiedAt: 2f29246
---

## Purpose
The home route `/`. Stacked full-bleed color sections separated by `[[section-waves]]`.
The conversion path runs to `#build` (the `[[configurator]]`) and `#collections`.

## Anchors & layout
Section ids: `top`, `sample`, `collections`, `faq`, `series`. Components in `components/home/`.
The `#sample` section (`components/home/sample.tsx`) sits directly below the hero — a calm
"coming soon" placeholder until the real sample video lands (set `SAMPLE_VIDEO_SRC`). It is
`cream`, same as the Categories section below it, so it needs no `[[section-waves]]` divider.

## Invariants
See frontmatter; the href='#' rule is currently unenforced (see tech-debt).

## Lineage
Seeded from the existing site at Mind setup.
Hero, CTA banner, and personalization FAQ repositioned from "hand-animate / by a real
artist" to crafted with editing tools + AI (2026-06-04, see `[[ai-crafted-not-hand-animated]]`).
Pre-launch UX (2026-06-15, Phase 2): added the `#sample` section below the hero and retargeted
the hero + CTA-banner "Watch a sample" buttons from `#collections` to `#sample` (the honest
target). Phase 1 had already replaced the fabricated "40,000+" social proof in the hero.
