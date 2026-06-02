---
name: section-waves
description: Use when adding or editing the transitions between page sections on Yours Fairy Tale — the "waves" / dividers between differently-colored full-bleed sections, or the footer's entry wave. Apply on every page, not just the homepage.
---

# Yours Fairy Tale — Section Waves

## Overview

Our pages are stacked **full-bleed color blocks** (yellow, cream, deep navy). Where
two adjacent blocks have **different** colors, we soften the seam with an organic
SVG **wave** carrying the brand's deep-ink comic crest. It makes the page feel like
a storybook turning, not a stack of flat bands. This is a **site-wide convention**,
not a homepage-only flourish.

## The component

`components/home/section-wave.tsx` exports `<SectionWave>`. It renders a full-width
block colored as the section **above** with a bottom-anchored wave filled as the
section **below**.

```tsx
<SectionWave from="yellow" to="cream" />
```

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `from` | `"yellow" \| "cream" \| "deep" \| "pink" \| "blue"` | — | Color of the section **above** (the divider's background). Must match it exactly. |
| `to` | same union | — | Color of the section **below** (the wave fill). Must match it exactly. |
| `amplitude` | `"gentle" \| "medium" \| "bounce"` | `"medium"` | The gentle↔bouncy dial. |
| `crest` | `boolean` | `true` | Deep-ink outline on the crest. **Auto-forced off when `to="deep"`** (ink is invisible on navy). |
| `flip` | `boolean` | `false` | Mirror horizontally so consecutive waves aren't identical. |

It's static and decorative (`aria-hidden`, no animation → nothing to guard for
reduced motion) and a plain component (no `"use client"`), so it works in both
Server and Client components.

## The rules

1. **One wave per differing-color boundary.** Walk the page top→bottom. Wherever a
   section's background differs from the next section's, drop a
   `<SectionWave from={above} to={below} />` between them.
2. **No wave on same-color boundaries.** Two cream sections in a row get nothing
   (e.g. the homepage FAQ → CTA banner).
3. **The footer owns its entry wave — never add one manually before `<SiteFooter />`.**
   `SiteFooter` renders its own `cream → deep` wave at the top, so every page that
   uses the footer (home, Series, Journal, blog posts) gets it for free. If a page's
   last section before the footer is **not** cream, pass it:
   `<SiteFooter waveFrom="yellow" />`.
4. **`to="deep"` drops the crest automatically** — don't fight it; the light→dark
   contrast carries the divider.
5. **Alternate `flip`** on consecutive waves for rhythm.
6. **Brand tokens only.** Never pass raw hex — the component maps the color union to
   `bg-brand-*` / `fill-brand-*` / `stroke-brand-deep` utilities. Keep the lookup
   objects as full literal class strings so Tailwind's scanner detects them.
7. **Waves live in the page/layout**, between section components — section
   components stay unaware of their neighbors.

## Current coverage

- **Homepage** (`app/page.tsx`): four internal waves (Hero→Categories,
  Categories→Configurator, Configurator→Series teaser, Series teaser→FAQ) plus the
  footer's own wave. FAQ→CTA is cream→cream, so no wave.
- **Series** (`app/series/*`) and **Journal** (`app/blog/*`): content sits on cream;
  the navy footer wave comes from `SiteFooter` via their layouts. No internal waves
  needed (single background).

## Adding waves to a new page

1. List each section's background color, top to bottom.
2. Between every pair where the color changes, insert a `<SectionWave from to>`.
3. Don't touch the footer transition — `SiteFooter` handles it (override `waveFrom`
   only if the last section isn't cream).
4. Run `npm run build` and eyeball each boundary: the `from` side must match the
   section above and the fill must match the section below, with no mismatched band.

## Example (homepage)

```tsx
<Hero />                                       {/* yellow */}
<SectionWave from="yellow" to="cream" />
<Categories />                                 {/* cream */}
<SectionWave from="cream" to="deep" flip />
<Configurator />                               {/* navy */}
<SectionWave from="deep" to="yellow" />
<SeriesTeaser />                               {/* yellow */}
<SectionWave from="yellow" to="cream" flip />
<Faq />                                        {/* cream */}
<CtaBanner />                                  {/* cream — no wave to footer here */}
{/* <SiteFooter /> supplies its own cream→navy wave */}
```
