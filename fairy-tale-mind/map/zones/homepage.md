---
type: zone
summary: "The live marketing homepage — hero, categories grid, configurator, series teaser, FAQ, CTA. The page we build forward."
tags: [surface, marketing]
status: active
created: 2026-06-02
updated: 2026-06-24
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
verifiedAt: b09c44f
---

## Purpose
The home route `/`. Stacked full-bleed color sections separated by `[[section-waves]]`.
The conversion path runs to `#build` (the `[[configurator]]`) and `#collections`.

## Anchors & layout
Section ids: `top`, `sample`, `collections`, `faq`, `series`. Components in `components/home/`.
The `#sample` section (`components/home/sample.tsx`) sits directly below the hero and now tells
a two-beat story on one cream background via an in-file `VideoCard` helper:
1. **The film** (blue chip, straight) — the animation sample (`SAMPLE_VIDEO_SRC`, a public
   `site-media` Blob URL), `preload="none"` + a poster (`public/sample/sample-poster.webp`), so
   zero video bytes load until play.
2. **Their first reaction** (pink chip, `rotate-[1deg]` tilt, testimonial caption) — a child's
   real first watch (`REACTION_VIDEO_SRC`, a public `site-media` Blob URL),
   `preload="metadata"` so its first frame is the poster (no poster asset). The clip is
   1080×1920 (9:16), so `VideoCard` takes an `aspect` prop (`"video"` | `"portrait"`): the
   reaction uses `aspect="portrait"` → an `aspect-[9/16]` frame, width-capped (`max-w-[340px]`)
   + centered, video `object-cover` so the matching-ratio frame fills with no black bars.
Both use native `<video>` controls (click-to-play, never autoplay) and keep the "coming soon"
null-src fallback. Bridged by a Fraunces-italic connective line. Still a server component
(`AnimatedHeading` is the only client boundary). Both srcs are hardcoded like every other
section — a studio/Payload-block-driven version is planned later. It is `cream`, same as the
Categories section below it, so it needs no `[[section-waves]]` divider.

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
First-reaction video added (2026-06-24): `#sample` expanded into a two-beat story — the
animation film (blue/straight) plus a child's real first reaction (`REACTION_VIDEO_SRC`,
pink/tilted/testimonial, `preload="metadata"`), bridged by a connective line. Differentiated by
color, tilt, and chip labels. Still static/hardcoded (no studio config yet); a Payload-block
version is the planned follow-up. Shipped to prod + verified live. Spec/plan:
`fairy-tale-mind/specs/2026-06-24-reaction-video-section-design.md`,
`fairy-tale-mind/plans/2026-06-24-reaction-video-section.md`.
Aspect-ratio fix (2026-06-24): the reaction clip is 9:16 portrait but `VideoCard` had
hardcoded `aspect-video` (16:9), pillarboxing it. Added an `aspect` prop (`"video"` |
`"portrait"`); the reaction renders `aspect-[9/16]` (capped + centered, `object-cover`), no
bars. Verified live (rendered box 9:16, matches source). A studio-driven aspect picker comes
with the Payload-block version.
