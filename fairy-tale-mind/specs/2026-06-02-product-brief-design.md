---
type: spec
summary: "Add a single product north-star brief to the Mind so future agents grasp what Yours Fairy Tale is and what we're trying to do."
tags: [product, the-mind]
status: planned
created: 2026-06-02
updated: 2026-06-02
related: ["[[product]]", "[[the-mind]]"]
sources: ["[[pivot-to-animated-videos]]"]
origin: "Make the knowledge base full of context about the product — abstract knowing of what it's about, comparing the actual site with the code (sections etc.), so future agents get what we're trying to do."
---

# Product north-star brief — design

## Goal
The Mind's zone cards capture *what/where* the code is. Add the missing *why*: one
strong, present-tense **brief** that captures the product essence and the page-by-page
narrative, grounded in the actual rendered site (not invented). Scope (chosen): **just
the brief** — existing zone cards are left untouched.

## Deliverables
1. New note type `brief` (README enum + `templates/brief.md`) — a first-class, typed note.
2. `fairy-tale-mind/map/product.md` (`type: brief`) — the north-star. Sections:
   - **What it is** — personalized, hand-animated fairy-tale videos starring the child.
   - **Who it's for** — the parent/gift-giver is the buyer; the child is the hero.
   - **The offer / how it works** — choose adventure, length, detail → configurator
     (`#build`) → preview → checkout (a **simulation**, no real charge).
   - **Positioning & brand** — keepsake, warm, calm; comic-storybook visual; links the
     `brand-voice` skill.
   - **The page story** — funnel narrative per surface: homepage arc (hero → `#collections`
     → `#build` → series teaser → FAQ → CTA), `/series` (premium upsell + waitlist),
     `/blog` "Journal" (content/trust/SEO). Real copy referenced (e.g. "An animated fairy
     tale made for them", the six story worlds, "40,000+ children already starring").
   - **Reality for future agents** — design-forward, not deployed; mock checkout; 10
     frozen concept pages (`legacy-examples`); books→videos pivot in progress.
   - Links `[[pivot-to-animated-videos]]` and the customer-facing zones in `related`.
3. New tech-debt `nav-placeholder-label` — the `"Matieniatus"` leftover nav label.
4. Discoverability (no zone-card edits): pointer to `map/product.md` from the
   `navigating-fairy-tale` skill, the CLAUDE.md Mind "orient" step, and the vault README.

## Verification
- `npm run mind` exits 0, 11 zones still `✓ fresh`, debt count rises by 1 (→ 6).
- The brief reads accurately against the rendered pages; no invented product claims.

## Out of scope
- No zone-card Purpose edits, no flow notes, no per-section intent files (deferred — could
  be a follow-up if richer context is wanted later).
