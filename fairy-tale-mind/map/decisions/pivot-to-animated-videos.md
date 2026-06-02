---
type: decision
summary: "The product pivoted from hand-illustrated hardcover books to hand-animated fairy-tale videos."
tags: [product]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[homepage]]", "[[configurator]]"]
sources: ["[[2026-06-01-video-product-switch-design]]", "[[2026-06-01-video-product-switch]]"]
decided: 2026-06-01
supersededBy: ""
---

## Context
The site launched around personalized hardcover storybooks. The offering moved to
personalized animated videos (see `app/layout.tsx` metadata and the configurator copy).

## Decision
Frame the product as hand-animated fairy-tale videos starring the child.

## Why
Animated video is faster to ship and far more scalable at pre-launch than a
hand-illustrated hardcover: no physical production, printing, inventory, or
shipping, and a personalized video is easier to preview and iterate on. Full
context in the video-product-switch spec/plan.

## Consequences
CLAUDE.md still describes hardcover books — tracked as `[[claude-md-says-hardcover]]`.
