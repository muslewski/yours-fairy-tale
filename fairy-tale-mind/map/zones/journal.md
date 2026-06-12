---
type: zone
summary: "The blog (\"Journal\") — index, posts, and RSS feed."
tags: [surface, content]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[app-shell]]", "[[design-system]]"]
sources: []
owns:
  routes: ["/blog"]
  anchors: ["route:/blog"]
  globs:
    - "app/(site)/blog/page.tsx"
    - "app/(site)/blog/[slug]/page.tsx"
    - "app/(site)/blog/[slug]/opengraph-image.tsx"
    - "app/(site)/blog/[slug]/twitter-image.tsx"
    - "app/(site)/blog/rss.xml/route.ts"
    - "components/blog/*"
    - "lib/blog.ts"
depends: ["[[app-shell]]", "[[design-system]]"]
invariants: []
verifiedAt: cf03e40
---

## Purpose
The `/blog` section of the site — a content marketing Journal.
Includes the post index, individual post pages, an RSS feed route, and shared blog UI components.
Data helpers live in `lib/blog.ts`.

## Lineage
Seeded from the existing site at Mind setup.
Repositioned from books to personalized videos, and from hand-illustration to crafted with editing tools + AI (2026-06-04).
Per-post dynamic OG/Twitter images added (post title on the brand card) via next/og
(2026-06-04, see `[[branded-og-and-favicons]]`).
