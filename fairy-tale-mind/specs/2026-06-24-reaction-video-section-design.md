---
title: Reaction video — expand the sample section into a two-beat story
date: 2026-06-24
status: design
zone: homepage
---

# Reaction video — "Watch the film. Then watch them."

## Problem

The homepage `#sample` section shows one video: a polished animation sample. We
have a second clip — a child's real first reaction to their fairy tale
(`YoursFairyTaleFirstReakcja.mp4`, already in public `site-media`) — that turns
the section from a product demo into a testimonial. We want both videos in the
sample area: the animation on top (the product), the reaction below (the human
payoff), clearly differentiated so neither is mistaken for the other.

Static for now (hardcoded blob URL, like every other homepage section). A
studio-editable, Payload-block-driven version comes later — explicitly out of
scope here.

## Approach (decided)

Expand the existing `components/home/sample.tsx` into a **single two-beat
section** (not a new sibling section). It stays `#sample`, `bg-brand-cream`, a
server component, flush above `Categories` with **no new `SectionWave`s** — the
calm existing flow is preserved.

The two beats read as cause → effect and are styled to contrast:

- **Beat 1 — the film:** the existing animation video. Clean, straight, large,
  blue accent, chip "The film". Unchanged behavior (poster + `preload="none"`).
- **Connective line:** a centered, lowercase, calm bridge — "and here's the part
  we make it for."
- **Beat 2 — the reaction:** the new clip. Pink accent, chip "Their first
  reaction", a Fredoka subhead, the video in a **slightly tilted** comic card
  (`rotate-[1deg]`) to feel candid/real versus the polished film, and a one-line
  testimonial caption beneath.

That visual contrast (blue/straight/clean vs pink/tilted/captioned) plus explicit
chip labels is the differentiation.

## Out of scope (YAGNI)

- No studio/Payload-block configuration — both srcs are hardcoded module consts,
  exactly like the current sample. (Block-driven version is a later project.)
- No new section, no new anchor, no new `SectionWave`s.
- No autoplay, no new animation library, no poster asset for the reaction (its
  first frame serves as the poster).

## Detailed design

### Component — `components/home/sample.tsx`

- Stays a **server component**; `AnimatedHeading` remains the only client
  boundary. No new client component, no Motion (the tilt is static CSS).
- Module consts:
  - `SAMPLE_VIDEO_SRC` (unchanged) + `SAMPLE_VIDEO_POSTER` (unchanged).
  - `REACTION_VIDEO_SRC: string | null =
    "https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/YoursFairyTaleFirstReakcja-FiSaPidNATfgNMYikocS3ptMGL7Rpi.mp4"`
- DRY both players into a small **in-file** `VideoCard` helper so the two frames
  don't duplicate markup:
  - Props: `{ src: string | null; poster?: string; preload: "none" | "metadata";
    tilt?: boolean; fallbackTitle: string; fallbackBody: string }`.
  - Renders the existing comic frame (`overflow-hidden rounded-[28px]
    border-[3px] border-brand-deep shadow-comic-lg`), the `<video>` (`controls`,
    `playsInline`, no autoplay), and the existing "coming soon" fallback when
    `src` is null.
  - `tilt` adds `rotate-[1deg]` (and the frame keeps its comic shadow, so the
    tilt reads as a candid photo card). No tilt on mobile is not required —
    1deg is subtle and safe at all widths.
- Section body (inside the existing `max-w-4xl` centered container):
  1. Eyebrow chip "See a sample" (blue) — unchanged.
  2. `<AnimatedHeading as="h2" text="Watch a sample film" />` — unchanged.
  3. Beat 1: a small blue chip "The film" + `<VideoCard src={SAMPLE_VIDEO_SRC}
     poster={SAMPLE_VIDEO_POSTER} preload="none" />` (the current player).
  4. Connective line: centered `<p>` — "and here's the part we make it for." —
     calm, lowercase, `text-brand-deep/60`, Fraunces or Quicksand italic accent.
  5. Beat 2: pink chip "Their first reaction" + Fredoka subhead "Watching them
     see themselves" + `<VideoCard src={REACTION_VIDEO_SRC} preload="metadata"
     tilt />` + caption "A real first watch, the moment a child meets their own
     fairy tale." (`text-brand-deep/60`).

### Video behavior

- Reaction `<video>`: `preload="metadata"` (loads only enough for the first
  frame, which acts as the poster — no poster asset needed), `controls`,
  `playsInline`, **no autoplay / no muted / no loop** (no surprise audio; matches
  the film's calm click-to-play).
- Film `<video>`: unchanged — `preload="none"`, `poster`, `controls`,
  `playsInline`.
- Both keep the null-`src` "coming soon" graceful fallback.

### Copy (brand voice — calm, parent-facing, American, sentence case, no SFX, no em-dash)

- Beat 1 chip: "The film"
- Connective: "and here's the part we make it for."
- Beat 2 chip: "Their first reaction"
- Beat 2 subhead: "Watching them see themselves"
- Beat 2 caption: "A real first watch, the moment a child meets their own fairy
  tale."
- Eyebrow ("See a sample") + H2 ("Watch a sample film"): unchanged.

## Verification

- `npx tsc --noEmit` clean; `npm run build` compiles.
- Headless Playwright on the deploy: both `<video>` elements present with the two
  distinct blob srcs; the chips "The film" + "Their first reaction" render; the
  reaction card carries the tilt; section still `bg-brand-cream` and flush with
  Categories (no new wave). Screenshot for a visual gut-check.

## Mind maintenance (on finish)

- Re-stamp the `homepage` zone card (and note the sample section now pairs the
  film with a reaction/testimonial video). If a `sample`-specific anchor/owns
  entry exists, update it.
- Decision record only if a non-obvious "why" emerges (likely not — this mirrors
  the existing static-site-media pattern). Note the forward pointer: this becomes
  Payload-block-driven later.

## Risk

Very low. One server-component file, additive, static, no pricing/checkout/auth
surface, no new dependencies. The only genuinely new bit is a second hardcoded
site-media video URL and a small presentational helper.
