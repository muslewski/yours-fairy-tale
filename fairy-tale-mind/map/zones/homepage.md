---
type: zone
summary: "The live marketing homepage — hero, categories grid, configurator, series teaser, FAQ, CTA. The page we build forward."
tags: [surface, marketing]
status: active
created: 2026-06-02
updated: 2026-06-16
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
verifiedAt: 2c8160b
---

## Purpose
The home route `/`. Stacked full-bleed color sections separated by `[[section-waves]]`.
The conversion path runs to `#build` (the `[[configurator]]`) and `#collections`.

## Anchors & layout
Section ids: `top`, `sample`, `collections`, `faq`, `series`. Components in `components/home/`.
The `#sample` section (`components/home/sample.tsx`) sits directly below the hero — it plays
the real sample film (a public `site-media` Blob URL in `SAMPLE_VIDEO_SRC`) in an inline
`<video>` with native controls (click-to-play, never autoplays). `preload="none"` + a poster
frame (`public/sample/sample-poster.webp`) means zero video bytes load until the visitor
presses play. The "coming soon" placeholder remains as a fallback if the src is ever cleared.
It is `cream`, same as the Categories section below it, so it needs no `[[section-waves]]` divider.

## Invariants
See frontmatter; the href='#' rule is currently unenforced (see tech-debt).

## Lineage
Seeded from the existing site at Mind setup.
Hero, CTA banner, and personalization FAQ repositioned from "hand-animate / by a real
artist" to crafted with editing tools + AI (2026-06-04, see `[[ai-crafted-not-hand-animated]]`).
Pre-launch UX (2026-06-15, Phase 2): added the `#sample` section below the hero and retargeted
the hero + CTA-banner "Watch a sample" buttons from `#collections` to `#sample` (the honest
target). Phase 1 had already replaced the fabricated "40,000+" social proof in the hero.
Sample film went live (2026-06-17): `SAMPLE_VIDEO_SRC` set to the uploaded `site-media` Blob
URL, with a `public/sample/sample-poster.webp` poster + `preload="none"` (click-to-play, zero
bytes until pressed). The film was encoded down to ~18MB (H.264, tune=animation) and uploaded
via /admin → Site media (which now accepts video — see `[[payload-backend]]`).
