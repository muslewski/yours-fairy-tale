---
name: nav-retrieval
description: Use when navigating this repo's code or Mind — find a definition/usage/file, trace an import, locate which note/decision explains something. Reach here BEFORE reflexive grep+Read.
---

# Navigating with ctx_search (default retrieval)

Default to **ctx_search** (context-mode MCP tool) — it returns the relevant slice, far cheaper than grep+read-whole-file at equal correctness. The index (code + this repo's Mind) is kept fresh automatically by the SessionStart hook (`scripts/nav-refresh-index.mjs`).

**Just call `ctx_search` with NO `project` param** — it defaults to this repo (cwd), which is exactly where both buckets are indexed. Do NOT pass `project: global` or a `.navidx-*` path — those resolve to a different/empty store and return "Knowledge base is empty". Results are tagged `Source: code:…` or `Source: mind:…`; optionally narrow with `source: code` / `source: mind`.

## Route by intent

| Intent | Tool |
|---|---|
| Known file path | Read directly — no search |
| Exact symbol ("where is X defined / who calls X") | `lsp` — semantic, exact, cheap |
| Broad ("where is X / which note explains Y / find the invariant / which spec") | `ctx_search` |
| ctx_search empty/wrong, or exhaustive matches needed | grep + Read fallback |
| Reading a known file / git / listing | `rtk read` / `rtk git` / `rtk ls` (token-compressed) |

## Per-bucket mode

**Mind (`fairy-tale-mind/`)** — `Source: mind:…` hits; the snippet captures the zone/decision summary inline, usually enough — no follow-up Read for orientation.

**Code (`src/`)** — `Source: code:…` hits; use `ctx_search` to **RANK**, then **Read the top ~3 whole hit files** (snippets alone miss the answer span; parse the `Source:` paths and Read those files whole).

## Rules

- Query with **distinctive content terms**, not whole questions ("pending clips sidecar", not "which note documents the pending clips sidecar").
- Retrieval is **lazy + per-question** — reach for it freely; NEVER preload the whole Mind or code tree (that re-pays the saved tokens).
- If results look stale: `node scripts/nav-refresh-index.mjs --force` then retry.
