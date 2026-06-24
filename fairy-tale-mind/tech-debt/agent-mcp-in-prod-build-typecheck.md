---
type: debt
summary: "The agent-mcp debug harness (tools/agent-mcp/**) is inside the prod `next build` typecheck graph — a type error there breaks `npm run build`."
tags: [dx, build, agent-mcp]
status: open
created: 2026-06-24
updated: 2026-06-24
related: ["[[cms-pages]]", "[[payload-backend]]"]
sources:
  - "tools/agent-mcp/server.ts"
  - "tsconfig.json"
severity: medium
effort: low
---

## Problem
`next build` runs `tsc` over the whole project, and the root `tsconfig.json`
`include` covers `tools/agent-mcp/**`. The harness is a dev-only debug tool (it
never ships and is excluded from the runtime bundle), yet a type error in it
fails the production build.

Hit live during the CMS-Pages end-to-end verification (2026-06-24): the
`onsessioninitialized` arrow in the stateful-session rewrite returned a `Map`
where the SDK types `() => void`, so `npm run build` aborted at "Running
TypeScript" with no app-code change involved. Fixed on `fix/agent-mcp-transport`
(commit d985575), but the underlying coupling remains: harness churn can break
the prod build.

## Fix
Take the harness out of the prod build's typecheck path. Options, cheapest first:
- Add `"tools/agent-mcp/**"` to the root `tsconfig.json` `exclude` and give the
  harness its own `tools/agent-mcp/tsconfig.json` (extends root) that `vite-node`
  + a dedicated `npm run agent:typecheck` use, so it's still type-checked, just
  not by `next build`.
- Or set `typescript.ignoreBuildErrors` scoping — rejected: it would mask app
  type errors too.

Keep the harness type-checked somewhere (CI or a pre-push hook); the goal is to
decouple it from `next build`, not to stop checking it.
