---
type: debt
summary: "CLAUDE.md still describes hardcover storybooks, but the product pivoted to animated videos."
tags: [docs]
status: resolved
created: 2026-06-02
updated: 2026-06-10
related: ["[[pivot-to-animated-videos]]", "[[ai-crafted-not-hand-animated]]"]
sources: []
severity: med
effort: low
---

## Resolved 2026-06-10
The launch-hardening docs pass rewrote CLAUDE.md's product paragraph: it now
describes personalized animated videos (the post-pivot product), removing the last
"hand-illustrated hardcover storybooks" framing. All previously-tracked surfaces
(blog, footer, brand-voice skill, `map/product.md`) had already been corrected on
2026-06-04.

## Problem
CLAUDE.md's project description and brand-voice references say "hardcover storybooks";
`app/layout.tsx` metadata and the live copy say animated videos.

## Fix
Reconcile CLAUDE.md (and the brand-voice word bank, e.g. "hardcover") with the video framing.

## Update (2026-06-04)
The live blog (10 posts + chrome), the footer, the brand-voice skill, and the product
north-star (`map/product.md`) are now all corrected to videos + AI-crafted positioning
(see `[[ai-crafted-not-hand-animated]]`). **CLAUDE.md is now the main remaining
book/hardcover reference** — it still describes "hand-illustrated hardcover storybooks"
in its project description. Lower priority since it's project instructions, not live copy.
