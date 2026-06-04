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
    - "app/blog/page.tsx"
    - "app/blog/[slug]/page.tsx"
    - "app/blog/rss.xml/route.ts"
    - "components/blog/*"
    - "lib/blog.ts"
depends: ["[[app-shell]]", "[[design-system]]"]
invariants: []
verifiedAt: 0252759
---

## Purpose
The `/blog` section of the site — a content marketing Journal.
Includes the post index, individual post pages, an RSS feed route, and shared blog UI components.
Data helpers live in `lib/blog.ts`.

## Lineage
Seeded from the existing site at Mind setup.
Repositioned from books to personalized videos, and from hand-illustration to crafted with editing tools + AI (2026-06-04).
