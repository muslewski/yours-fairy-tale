---
type: zone
summary: "The Mind itself — the generator, the status hook, and the map-sync command."
tags: [infrastructure, tooling]
status: active
created: 2026-06-02
updated: 2026-06-02
related: []
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "scripts/mind/*"
    - ".claude/settings.json"
    - ".claude/commands/map-sync.md"
depends: []
invariants: []
skills: ["[[navigating-fairy-tale]]", "[[obsidian-markdown]]", "[[obsidian-bases]]", "[[json-canvas]]"]
verifiedAt: 47ac623
---

## Purpose
The implementation of the Mind knowledge system itself.
`scripts/mind/generate.mjs` validates zone cards against live code and writes `fairy-tale-mind/map/index.md`.
`scripts/mind/status.mjs` provides the status hook.
`.claude/settings.json` wires the generator into the project's toolchain.
The vault also carries hand-authored Bases dashboards (`fairy-tale-mind/bases/`) — aggregate, frontmatter-driven views over the structured (`type:`-tagged) corpus. They **complement** the generator (which verifies cards against live code), never replace it; `.base`/`.canvas` files sit outside the generator's globs by design.

Note: the vault markdown (`fairy-tale-mind/**`) is intentionally excluded from these globs to avoid
self-stale behaviour on every vault commit.

## Lineage
Seeded from the existing site at Mind setup.
