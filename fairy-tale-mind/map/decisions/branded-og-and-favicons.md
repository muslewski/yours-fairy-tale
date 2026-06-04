---
type: decision
summary: "Favicons/web manifest follow Next 16 file conventions (app/favicon.ico, icon0.svg, icon1.png, apple-icon.png, app/manifest.json). Social/OG images are generated dynamically with next/og (lib/og.tsx): one branded site-wide card and a per-Journal-post card with the title. Fredoka is bundled (woff in assets/) and brand PNGs are inlined as data URIs, so generation needs no network and stays statically optimized. metadataBase points at the www canonical."
tags: [metadata, seo, social, infrastructure]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[app-shell]]", "[[journal]]", "[[design-system]]"]
sources: []
decided: 2026-06-04
supersededBy: ""
---

## Context
The site had a single favicon.ico and no social metadata: shared links showed no
preview image, and there was no web manifest / apple home-screen setup. The owner
supplied a realfavicongenerator export and asked for proper social/OG support.

## Decision
- **Favicons via Next 16 file conventions** in `app/`: `favicon.ico`, `icon0.svg`
  + `icon1.png` (Next auto-detects numbered icons), `apple-icon.png`, and a
  branded `app/manifest.json` (cream background, deep theme color, short_name
  "Fairy Tale"). The two `web-app-manifest-{192,512}.png` live in `public/`.
- **Social metadata** in `app/layout.tsx`: `metadataBase` = `https://www.yoursfairytale.com`
  (the apex 308-redirects to www), `openGraph`, `twitter` (summary_large_image),
  `keywords`, canonical, `appleWebApp.title` = "Fairy Tale", and a `viewport`
  theme-color (cream).
- **OG images via `next/og`** (`lib/og.tsx`): a shared brand frame with two
  entry points — `renderSiteOg()` (home/site-wide: headline, social proof,
  astronaut) and `renderPostOg(title, category)` (per Journal post). Wired through
  the `opengraph-image`/`twitter-image` file conventions at the root and in
  `app/blog/[slug]/`. We do NOT set `metadata.openGraph.images` (the file
  convention provides og:image; setting both would duplicate the tag).

## Why dynamic over a static PNG
Per-post cards (title baked in) need generation; a single renderer covers both
site-wide and per-post and stays on-brand. To keep it reliable and build-time
static: Fredoka is bundled as woff in `assets/` (Satori-compatible) and the brand
PNGs are read from `public/` and inlined as base64 data URIs — no network at build.

## Consequences
- New fonts/brand images used in OG must be added to `assets/`/`public/` and read
  locally (never fetched at build) to keep generation deterministic and offline.
- The OG routes are statically optimized; no per-request cost.
- If a route needs a different social image, add an `opengraph-image` in that
  segment (overrides the root).
