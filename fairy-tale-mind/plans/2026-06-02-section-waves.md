---
type: plan
summary: "Add a reusable SectionWave component and insert it between the five color-boundary sections on the homepage."
tags: []
status: done
created: 2026-06-02
updated: 2026-06-02
related: []
sources: []
implements: "[[2026-06-02-section-waves-design]]"
produced: ["[[section-waves]]", "[[footer-owns-its-wave]]"]
---

# Section-divider Waves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add organic SVG wave dividers between the homepage's solid color-block sections, with the brand's deep-ink comic crest where visible.

**Architecture:** One reusable, static (no `"use client"`) `SectionWave` component renders a full-width block colored as the section above, with a bottom-anchored SVG wave filled as the section below + an optional ink crest. It's dropped into `app/page.tsx` between sections at the five real color boundaries; the section components are untouched.

**Tech Stack:** Next.js 16 (App Router, Server Components) · React 19 · Tailwind CSS v4 (`fill-*`/`stroke-*`/`bg-*` utilities from the `@theme` brand palette). No new dependencies.

> **Testing note.** This repo has no unit-test harness by design (no test scripts/deps/files). Per the existing pattern and CLAUDE.md, do NOT add one. Verification gates: (1) `npm run build` passes (Next 16 runs typecheck + lint + compile), and (2) browser checks. Each task ends with the relevant gate + a commit.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `components/home/section-wave.tsx` | Presentational wave divider: maps `from`/`to` brand colors + `amplitude` to a full-width SVG wave with optional ink crest. One clear responsibility, no app knowledge. | **Create** |
| `app/page.tsx` | Place `<SectionWave>` between sections at the five color boundaries. | **Modify** |

---

## Task 1: Create the SectionWave component

**Files:**
- Create: `components/home/section-wave.tsx`

- [ ] **Step 1: Write the component**

Create `components/home/section-wave.tsx` with exactly this content:

```tsx
import { cn } from "@/lib/utils";

/**
 * Decorative wave divider between two solid-color homepage sections.
 *
 * Renders a full-width block whose BACKGROUND is the `from` color (matching the
 * section above) with a bottom-anchored SVG wave FILLED with the `to` color
 * (matching the section below). Because both are solid brand tokens that match
 * the adjacent sections exactly, it reads as one seamless wavy color transition.
 *
 * The brand's deep-ink crest outline is drawn on the wave edge, except when the
 * fill is navy (`to === "deep"`) — ink is invisible there, so the light→dark
 * contrast carries the divider instead.
 *
 * Static and decorative: no animation (nothing to guard for reduced motion),
 * `aria-hidden`, no semantic role.
 */

type BrandColor = "yellow" | "cream" | "deep" | "pink" | "blue";
type Amplitude = "gentle" | "medium" | "bounce";

// Full literal class names so Tailwind's scanner detects them (no dynamic strings).
const BG: Record<BrandColor, string> = {
  yellow: "bg-brand-yellow",
  cream: "bg-brand-cream",
  deep: "bg-brand-deep",
  pink: "bg-brand-pink",
  blue: "bg-brand-blue",
};

const FILL: Record<BrandColor, string> = {
  yellow: "fill-brand-yellow",
  cream: "fill-brand-cream",
  deep: "fill-brand-deep",
  pink: "fill-brand-pink",
  blue: "fill-brand-blue",
};

// viewBox is 0 0 1200 120. `fill` is the closed wave shape; `crest` is the open
// top edge (stroked with the ink outline).
const WAVES: Record<Amplitude, { fill: string; crest: string }> = {
  gentle: {
    fill: "M0,60 C400,95 800,25 1200,60 L1200,120 L0,120 Z",
    crest: "M0,60 C400,95 800,25 1200,60",
  },
  medium: {
    fill: "M0,64 C300,30 500,98 700,64 C900,34 1050,92 1200,58 L1200,120 L0,120 Z",
    crest: "M0,64 C300,30 500,98 700,64 C900,34 1050,92 1200,58",
  },
  bounce: {
    fill: "M0,70 C200,10 400,120 600,70 C800,20 1000,120 1200,65 L1200,120 L0,120 Z",
    crest: "M0,70 C200,10 400,120 600,70 C800,20 1000,120 1200,65",
  },
};

interface SectionWaveProps {
  /** Color of the section above — the divider's background. */
  from: BrandColor;
  /** Color of the section below — the wave fill. */
  to: BrandColor;
  /** Wave intensity (gentle ↔ bounce dial). Default "medium". */
  amplitude?: Amplitude;
  /** Draw the deep-ink crest outline. Default true; auto-off when `to` is navy. */
  crest?: boolean;
  /** Mirror horizontally so consecutive waves aren't identical. */
  flip?: boolean;
  className?: string;
}

export function SectionWave({
  from,
  to,
  amplitude = "medium",
  crest = true,
  flip = false,
  className,
}: SectionWaveProps) {
  const paths = WAVES[amplitude];
  const showCrest = crest && to !== "deep";

  return (
    <div
      aria-hidden="true"
      className={cn("relative h-14 w-full sm:h-20 lg:h-24", BG[from], className)}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className={cn("absolute inset-0 block h-full w-full", flip && "-scale-x-100")}
      >
        <path d={paths.fill} className={FILL[to]} />
        {showCrest && (
          <path
            d={paths.crest}
            fill="none"
            className="stroke-brand-deep"
            strokeWidth={4}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Compile gate**

Run: `npm run build`
Expected: build succeeds. The component compiles; `SectionWave` is exported; the `fill-brand-*` / `stroke-brand-deep` / `bg-brand-*` utilities resolve from the `@theme` palette.

- [ ] **Step 3: Commit**

```bash
git add components/home/section-wave.tsx
git commit -m "Add SectionWave divider component"
```

---

## Task 2: Wire the five dividers into the homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add the import**

In `app/page.tsx`, add this import after the existing `import { SiteFooter } ...` line (keep the other imports as they are):

```tsx
import { SectionWave } from "@/components/home/section-wave";
```

- [ ] **Step 2: Place the dividers between sections**

The `<main>` currently reads:

```tsx
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        <Hero />
        <Categories />
        <Configurator />
        <SeriesTeaser />
        <Faq />
        <CtaBanner />
      </main>
```

Replace it with (note: the footer divider goes AFTER `</main>` but BEFORE `<SiteFooter />`, because the footer is outside `<main>`):

```tsx
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
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
      </main>

      <SectionWave from="cream" to="deep" />
      <SiteFooter />
```

Notes for the engineer:
- FAQ → CTA banner is cream → cream, so there is intentionally **no** divider there.
- The two `to="deep"` dividers auto-drop the ink crest (navy fill).
- `flip` alternates so consecutive waves don't look identical.

- [ ] **Step 3: Compile gate**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "Add wave dividers between homepage sections"
```

---

## Task 3: Browser verification

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: dev server ready (port 3000, or the next free port such as 3001).

- [ ] **Step 2: Verify the five dividers**

Open the homepage and scroll top to bottom. Confirm, at each boundary:
1. Hero (yellow) → Categories (cream): wave with a **dark ink crest**; yellow above, cream below; no hard seam line.
2. Categories (cream) → Configurator (navy): wave, **no ink crest** (navy fill); cream above, navy below.
3. Configurator (navy) → Series teaser (yellow): wave with **ink crest**; navy above, yellow below.
4. Series teaser (yellow) → FAQ (cream): wave with **ink crest** (mirrored vs #1).
5. CTA banner (cream) → Footer (navy): wave, **no ink crest**; cream above, navy below.
6. FAQ → CTA banner: **no wave** (both cream) — confirm there is no stray divider.

Also confirm: the `from` color always matches the section above and the wave fill matches the section below (no mismatched-color band), the crest stroke weight looks even across the full width, and the waves scale cleanly when you narrow the window to a phone width (no clipping or distortion of the outline thickness).

- [ ] **Step 3: Final build gate**

Run: `npm run build`
Expected: build succeeds.

(No code change expected in this task. If verification surfaces a defect, fix it, re-build, and commit with a descriptive message.)

---

## Self-Review (completed during planning)

- **Spec coverage:** reusable component with `from`/`to`/`amplitude`/`crest`/`flip` props (Task 1); brand-token classes via literal lookup objects, no raw hex (Task 1); `amplitude` default `"medium"` and tunable (Task 1); ink crest with `non-scaling-stroke`, auto-off on navy fill (Task 1); five dividers at the correct boundaries with FAQ→CTA skipped (Task 2); `aria-hidden`, static, responsive height (Task 1); footer divider placed outside `<main>` (Task 2); verification of all boundaries (Task 3). All spec sections map to a task.
- **Placeholder scan:** no TBDs; full component code and exact page edits provided.
- **Type consistency:** `BrandColor` and `Amplitude` unions are used consistently across `BG`, `FILL`, `WAVES`, and `SectionWaveProps`; `showCrest` derives from `crest` + `to`; the page passes only valid union values (`yellow`/`cream`/`deep`).
```
