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
depends: []
invariants: []
verifiedAt: 73b3cb8c3542e6bf0cf1814cde54e21b006c6158
---

## Purpose
The implementation of the Mind knowledge system itself.
`scripts/mind/generate.mjs` validates zone cards against live code and writes `fairy-tale-mind/map/index.md`.
`scripts/mind/status.mjs` provides the status hook.
`.claude/settings.json` wires the generator into the project's toolchain.

Note: the vault markdown (`fairy-tale-mind/**`) is intentionally excluded from these globs to avoid
self-stale behaviour on every vault commit.

## Lineage
Seeded from the existing site at Mind setup.
