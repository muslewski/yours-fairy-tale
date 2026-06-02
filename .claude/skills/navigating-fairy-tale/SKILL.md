---
name: navigating-fairy-tale
description: Use at the start of any task in this repo to orient before coding — find the right zone, its anchors, invariants, and lineage via the Mind (fairy-tale-mind/).
---

# Navigating Yours Fairy Tale

Orient via the Mind before touching code. Do not restate the Map here — go read it.

1. **Open `fairy-tale-mind/map/index.md`** — the generated table of zones, their status,
   freshness, and one-line essence. Pick the zone(s) your task touches.
2. **Read that zone card** (`fairy-tale-mind/map/zones/<slug>.md`) — its purpose, `owns`
   (globs/anchors/routes), `depends`, `invariants`, and `verifiedAt`.
3. **Trace `sources`/`related`** — the specs, plans, and decisions behind it
   (`fairy-tale-mind/{specs,plans}/`, `map/decisions/`).
4. **Check `fairy-tale-mind/tech-debt/`** for known issues in that area.
5. **Conventions** live in `CLAUDE.md` (design system, brand voice, the Mind rule) and the
   `brand-voice` / `section-waves` skills.

On finish, maintain the Mind (see the CLAUDE.md "The Mind" rule): update zone cards,
re-stamp `verifiedAt`, add decisions/tech-debt, `npm run mind`, commit `index.md`.
