// Env + safety guard MUST run before anything imports Payload.
import "./bootstrap-env";

import { createServer } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

async function main(): Promise<void> {
  // Dynamic import: pulls in the tools + Payload AFTER env is loaded.
  const { registerTools } = await import("./register");

  const server = new McpServer({ name: "yours-fairy-tale-agent", version: "0.1.0" });
  const names = registerTools(server);

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  const port = Number(process.env.AGENT_MCP_PORT ?? 39199);
  const http = createServer((req, res) => {
    if (req.url?.startsWith("/mcp")) {
      void transport.handleRequest(req, res);
      return;
    }
    res.writeHead(404).end();
  });
  http.listen(port, () => {
    // stderr only — stdout is reserved (Payload logs there; MCP HTTP body is separate).
    console.error(`[agent-mcp] listening on http://localhost:${port}/mcp — ${names.length} tools`);
  });
}

main().catch((err) => {
  console.error("[agent-mcp] failed to start:", err);
  process.exit(1);
});
