---
type: decision
summary: "The agent MCP server runs under vite-node (not bare Node or tsx) and uses the HTTP transport (not stdio). vite-node is the only loader proven to boot Payload's ESM config + @/ aliases outside Next's bundler; HTTP transport is necessary because Payload logs to stdout, which would corrupt a stdio MCP frame."
tags: [tooling, mcp, agent, infrastructure]
status: active
created: 2026-06-14
updated: 2026-06-14
related: ["[[agent-tooling]]", "[[payload-backend]]"]
sources: ["[[2026-06-14-agent-order-tooling-mcp-design]]"]
decided: 2026-06-14
supersededBy: ""
---

## Context

The MCP server must boot Payload's Local API in a long-lived Node process so tools can
call it without a cold-start on every invocation. Two independent questions arose during
planning:

1. **Which loader?** Bare `node`, `tsx`, or `vite-node`?
2. **Which MCP transport?** `stdio` or HTTP?

## Decision — loader: `vite-node`

`payload.config.ts` uses:
- Extensionless relative imports (`import "./collections/Orders"`) that require
  `moduleResolution: "bundler"` — a TypeScript mode only honored by Next's bundler and Vite.
- The `@payload-config` alias (`tsconfig.json:paths`) and `@/` alias.

**Bare Node** (`node --experimental-vm-modules`) cannot resolve either without a custom
loader. **tsx** (the TypeScript runner used by older Payload tooling) crashes on the same
extensionless imports — this was observed when running `payload migrate` on this stack and
is documented in the `payload-backend` zone notes.

**vite-node** (from the `vite-node` package, part of the vitest ecosystem) runs code
through Vite's module graph, which resolves `moduleResolution: "bundler"` semantics and
honors `vite.config.ts` aliases. `e2e/fixtures/seed.vitest.config.ts` already proved this
pattern: the Playwright seed fixtures boot the real Payload Local API out-of-process via
vitest + vite. `tools/agent-mcp/vite.config.ts` mirrors those two aliases exactly.

The run script is:
```
vite-node --config tools/agent-mcp/vite.config.ts tools/agent-mcp/server.ts
```

## Decision — transport: HTTP (not stdio)

**stdio transport** pipes MCP frames over the process's stdin/stdout. Payload (and some of
its plugins) write log output to `stdout` during initialization and on every request. Any
stdout write — even a single character — would corrupt the MCP framing, causing the client
to parse garbage as JSON-RPC and drop the connection.

**HTTP transport** (`@modelcontextprotocol/sdk/server/streamableHttp.js`,
`StreamableHTTPServerTransport`) runs on a separate TCP socket (port 39199 by default,
overridable via `AGENT_MCP_PORT`). Payload's stdout logs are irrelevant — they go to the
terminal, not the MCP pipe. All MCP server-side diagnostic logging uses `console.error`
(stderr), also disjoint from MCP frames.

The server registers at `http://localhost:39199/mcp` and the repo's `.mcp.json` points
agents there:
```json
{ "mcpServers": { "yours-fairy-tale-agent": { "type": "http", "url": "http://localhost:39199/mcp" } } }
```

## Consequences

- Adding `vite-node` as a dev dependency pulls in Vite, which is otherwise not in this
  repo (it is not required for Next's build). The dev-only scope keeps it out of the
  production bundle.
- If a future Payload version resolves the extensionless-import issue under `tsx`, the
  loader could be reconsidered — but `vite-node` is already a transitive dependency of
  vitest, so no net new dependency is introduced in practice.
- The HTTP transport requires a running server process (`npm run agent:mcp`) before
  agents can connect. There is no auto-start; agents that need the harness must start it
  as a prerequisite step.
- Port 39199 is hardcoded as a default but overridable via `AGENT_MCP_PORT` in `.env.test`.
