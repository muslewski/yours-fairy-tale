# Reaction Video Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Expand the homepage `#sample` section into a two-beat story — the animation film (top) and a child's real first reaction (below) — differentiated by color/tilt/label, static and hardcoded like the other sections.

**Architecture:** Edit one server component (`components/home/sample.tsx`). Add a second hardcoded site-media blob URL and a small in-file `VideoCard` helper that renders both players (variant via a `tilt` prop). No new section, no new wave, no studio config, no new dependency.

**Tech Stack:** Next.js 16 server component, React 19, Tailwind v4 (brand tokens), native `<video>`.

## Global Constraints

- **Spec:** `fairy-tale-mind/specs/2026-06-24-reaction-video-section-design.md`.
- Colors: brand tokens only (`bg-brand-cream/blue/pink/deep`, `text-brand-deep`, `border-brand-deep`); no hardcoded hex.
- Comic shadow via `shadow-comic-sm` / `shadow-comic-lg` tokens.
- Fonts: headings `var(--font-fredoka)`; editorial accent `var(--font-fraunces)`.
- Stays a **server component** (`AnimatedHeading` is the only client boundary). No Motion, no `"use client"`, no new file.
- Brand voice: calm, parent-facing, American English, sentence case, no em-dash, no SFX, no autoplay/surprise audio.
- Static only — both srcs are hardcoded module consts (Payload-block version is a later project).
- Reaction blob URL (verbatim): `https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/YoursFairyTaleFirstReakcja-FiSaPidNATfgNMYikocS3ptMGL7Rpi.mp4`

---

### Task 1: Two-beat sample section

**Files:**
- Modify (full rewrite): `components/home/sample.tsx`

**Interfaces:**
- Produces: `Sample()` (unchanged export, consumed by `app/(site)/page.tsx`). New in-file `VideoCard({ src, poster?, preload, tilt?, fallbackTitle, fallbackBody })`.

> No unit test — presentational server component; the repo has no component-test harness for homepage sections (the current `sample.tsx` has none). Verified by `tsc` + build + a headless Playwright pass (Task 2).

- [ ] **Step 1: Replace the file contents**

Write `components/home/sample.tsx` exactly as:

```tsx
import { AnimatedHeading } from "@/components/motion/animated-heading";

/**
 * The sample section, first thing below the hero. Two beats on one cream
 * background:
 *   1. "The film" — the polished animation sample (poster + preload="none", so
 *      zero video bytes load until the visitor presses play).
 *   2. "Their first reaction" — a child's real first watch (preload="metadata"
 *      so the first frame acts as the poster; no poster asset needed).
 * Both are public site-media Blob URLs, hardcoded like every other section
 * (a studio / Payload-block-driven version comes later). The null-src "coming
 * soon" branch stays as a graceful fallback for either video.
 */
const SAMPLE_VIDEO_SRC: string | null =
  "https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/sample-movie1-cIJRpGT7nq8rXiOMxT7Acs3nEyGRlv.mp4";
const SAMPLE_VIDEO_POSTER = "/sample/sample-poster.webp";
const REACTION_VIDEO_SRC: string | null =
  "https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/YoursFairyTaleFirstReakcja-FiSaPidNATfgNMYikocS3ptMGL7Rpi.mp4";

function VideoCard({
  src,
  poster,
  preload,
  tilt = false,
  fallbackTitle,
  fallbackBody,
}: {
  src: string | null;
  poster?: string;
  preload: "none" | "metadata";
  tilt?: boolean;
  fallbackTitle: string;
  fallbackBody: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg ${
        tilt ? "rotate-[1deg]" : ""
      }`}
    >
      {src ? (
        <video
          src={src}
          poster={poster}
          preload={preload}
          controls
          playsInline
          className="aspect-video w-full bg-brand-deep"
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-brand-deep text-white">
          <span className="text-lg font-black uppercase tracking-wide">{fallbackTitle}</span>
          <span className="max-w-md text-sm font-medium text-white/70">{fallbackBody}</span>
        </div>
      )}
    </div>
  );
}

export function Sample() {
  return (
    <section id="sample" className="bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
        <span className="inline-block rotate-[-1deg] rounded-lg border-[3px] border-brand-deep bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          See a sample
        </span>
        <AnimatedHeading
          as="h2"
          text="Watch a sample film"
          className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
        />

        {/* Beat 1 — the film */}
        <div className="mt-8">
          <span className="inline-block rounded-md border-[3px] border-brand-deep bg-brand-blue px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
            The film
          </span>
          <div className="mt-4">
            <VideoCard
              src={SAMPLE_VIDEO_SRC}
              poster={SAMPLE_VIDEO_POSTER}
              preload="none"
              fallbackTitle="Sample coming soon"
              fallbackBody="We're finishing our first sample film. It will live here, ready to watch, very soon."
            />
          </div>
        </div>

        {/* Connective line */}
        <p className="mt-10 font-[family-name:var(--font-fraunces)] text-lg italic text-brand-deep/60">
          and here&apos;s the part we make it for.
        </p>

        {/* Beat 2 — their first reaction */}
        <div className="mt-10">
          <span className="inline-block rotate-[1deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-comic-sm">
            Their first reaction
          </span>
          <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Watching them see themselves
          </h3>
          <div className="mt-8">
            <VideoCard
              src={REACTION_VIDEO_SRC}
              preload="metadata"
              tilt
              fallbackTitle="Reaction coming soon"
              fallbackBody="The first real reactions are on their way. They'll live right here."
            />
          </div>
          <p className="mt-6 text-sm font-medium text-brand-deep/60">
            A real first watch, the moment a child meets their own fairy tale.
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: `No errors found`.

- [ ] **Step 3: Commit**

```bash
git add components/home/sample.tsx
git commit -m "feat(homepage): pair the sample film with a first-reaction video"
```

---

### Task 2: Verify on deploy

**Files:** none.

- [ ] **Step 1: Build (if env available) / else rely on tsc + deploy**

Run: `npm run build` if a local DB+secret exist; otherwise note that build is verified on the Vercel deploy. tsc (Task 1) is the local gate.

- [ ] **Step 2: Headless Playwright pass on the deploy**

After deploy READY, with Playwright (chromium) against the live URL:
- both `<video>` elements present, with srcs ending `sample-movie1-...mp4` and `YoursFairyTaleFirstReakcja-...mp4`;
- text "The film" and "Their first reaction" present;
- the reaction card element's computed `transform`/`rotate` is non-identity (tilt applied);
- `#sample` still `bg-brand-cream`; no new `SectionWave` between Sample and Categories.
- Screenshot for a visual gut-check (both players, contrast, tilt).

- [ ] **Step 3: No commit** (verification only) unless a fix was needed.

---

## Mind maintenance (recollection)

- Re-stamp the `homepage` zone card; note `#sample` now pairs the animation film with a first-reaction/testimonial video (still static site-media; Payload-block version later). Update any `sample` owns/anchor entry.
- Decision record only if a non-obvious "why" surfaces (unlikely — mirrors the existing static-site-media pattern).
- `npm run mind`; commit the updated card + `map/index.md` to `main`.

## Self-Review (completed)

- **Spec coverage:** combined section → Task 1; two-beat film/connective/reaction + differentiation (blue/straight vs pink/tilt) → Task 1 markup; reaction `preload="metadata"`, no autoplay, null fallback → `VideoCard`; copy verbatim → Task 1; verification → Task 2; Mind → recollection. All covered.
- **Placeholder scan:** none — full file given.
- **Type consistency:** `VideoCard` prop names/types match their single call sites; `preload` union `"none" | "metadata"` matches both usages.
