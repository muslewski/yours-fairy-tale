# Section-divider waves — Yours Fairy Tale

**Date:** 2026-06-02
**Status:** Approved (design), ready for implementation plan

## Goal

Add organic SVG "wave" dividers between the homepage's solid color-block sections,
so the transitions between differently-colored sections feel softer and more
storybook. Waves carry the brand's signature deep-ink comic outline on the crest
where it's visible.

## Visual decisions (from brainstorming)

- **Shape:** a single smooth Bézier wave (not scalloped, not layered). The user
  liked both "gentle roll" and "playful bounce", so the default is a **medium
  amplitude** between the two, exposed as a tunable `amplitude` prop (the
  gentle↔bouncy dial) for one-number adjustment after live review.
- **Crest outline:** the brand deep-ink stroke (`brand-deep`) traces the wave
  crest, matching the comic `border-[3px]`/`border-[4px]` outlines. Uses
  `vector-effect="non-scaling-stroke"` so the weight stays even when the path is
  stretched full-width. **Omitted when the wave fill is `brand-deep` (navy)** —
  an ink crest is invisible against navy; the light→dark color contrast carries
  the divider there.
- **Static**, full-width, responsive height. No animation (so no reduced-motion
  concern). Decorative (`aria-hidden`).

## Architecture

### `components/home/section-wave.tsx` (new)

One reusable presentational component. A full-width block whose **background is the
`from` color** (matching the section above) with a bottom-anchored SVG wave **filled
with the `to` color** (matching the section below) and an optional ink crest. Because
both colors are solid brand tokens that exactly match the adjacent sections, the
divider reads as a seamless wavy color transition.

**Props:**

```ts
type BrandColor = "yellow" | "cream" | "deep" | "pink" | "blue";

interface SectionWaveProps {
  from: BrandColor;          // color above — the divider block's background
  to: BrandColor;            // color below — the wave fill
  amplitude?: "gentle" | "medium" | "bounce"; // default "medium"
  crest?: boolean;           // ink outline on crest; default true,
                             // auto-forced off when `to === "deep"`
  flip?: boolean;            // mirror horizontally for variety; default false
  className?: string;
}
```

- Colors map to Tailwind utilities, never raw hex: background via `bg-brand-${from}`,
  wave fill via `fill-brand-${to}`, crest via `stroke-brand-deep`. A small lookup
  object maps the `BrandColor` union to the static class names (so Tailwind's
  scanner sees complete literals — no dynamically-constructed class strings, which
  Tailwind v4 cannot detect).
- `amplitude` selects among three pre-authored SVG path pairs (fill path + crest
  path). Each path uses `viewBox="0 0 1200 H"` with `preserveAspectRatio="none"`.
- Height: responsive via classes, e.g. `h-14 sm:h-20 lg:h-24` (~56/80/96px).
- The SVG is `block w-full h-full` inside a relatively-positioned wrapper; the
  wrapper has `bg-brand-${from}` so the area above the wave shows the `from` color.
- `aria-hidden="true"`, no role (purely decorative).

### `app/page.tsx` (modify)

Insert `<SectionWave>` between sections at the five real color boundaries. Sections
are unchanged. FAQ→CTA banner is cream→cream and gets **no** wave.

```tsx
<Hero />
<SectionWave from="yellow" to="cream" />
<Categories />
<SectionWave from="cream" to="deep" flip />
<Configurator />
<SectionWave from="deep" to="yellow" />
<SeriesTeaser />
<SectionWave from="yellow" to="cream" flip />
<Faq />
<CtaBanner />
<SectionWave from="cream" to="deep" />
<SiteFooter />
```

(`flip` alternates so consecutive waves aren't identical. `to="deep"` dividers
auto-drop the crest.)

## Section background reference (current homepage)

| Section | Background |
|---------|-----------|
| Hero | `bg-brand-yellow` |
| Categories | `bg-brand-cream` |
| Configurator | `bg-brand-deep` |
| Series teaser | `bg-brand-yellow` |
| FAQ | `bg-brand-cream` |
| CTA banner | `bg-brand-cream` (outer) |
| Footer | `bg-brand-deep` |

## Accessibility

- Decorative only: `aria-hidden="true"`, no semantic role, no text.
- No motion, so nothing to guard for reduced motion.

## Out of scope (YAGNI)

- No animated/parallax waves.
- No per-section edits (waves live only in `page.tsx`).
- No layered/multi-color waves or scallops (single smooth wave only).
- No new dependencies.
- Concept/legacy pages and the blog are untouched.

## Verification

- `npm run build` passes.
- Each of the five dividers renders a seamless wave between the correct colors
  (the `from` side matches the section above, the wave fill matches the section
  below); no visible seam line of a mismatched color.
- Ink crest is visible on the cream/yellow-fill waves and absent on the two
  navy-fill waves.
- Crest stroke weight looks even across the full width (non-scaling-stroke).
- Responsive: waves scale cleanly from mobile to desktop with no clipping.
- The `amplitude` default reads as a comfortable medium; confirm the value is a
  single-prop change for final tuning.
```
