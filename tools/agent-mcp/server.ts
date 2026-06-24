// Env + safety guard MUST run before anything imports Payload.
import "./bootstrap-env";

import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

/**
 * Drain the request stream into a parsed JSON body. We must read it ourselves
 * (and hand it to handleRequest as parsedBody) because we inspect the body to
 * decide whether a session-less POST is a valid `initialize` request.
 */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function main(): Promise<void> {
  // Dynamic import: pulls in the tools + Payload AFTER env is loaded.
  const { registerTools } = await import("./register");

  // One transport + McpServer per MCP session. The Streamable HTTP transport is
  // stateful: a single shared transport throws on its second request
  // ("Stateless transport cannot be reused"), so we key one per session id and
  // route by the `mcp-session-id` header — the documented SDK pattern.
  const transports = new Map<string, StreamableHTTPServerTransport>();
  let toolCount = 0;

  const badRequest = (res: import("node:http").ServerResponse, message: string) =>
    res
      .writeHead(400, { "content-type": "application/json" })
      .end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));

  const http = createServer(async (req, res) => {
    if (!req.url?.startsWith("/mcp")) {
      res.writeHead(404).end();
      return;
    }

    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    try {
      if (req.method === "POST") {
        const body = await readJsonBody(req);
        let transport = sessionId ? transports.get(sessionId) : undefined;

        if (!transport) {
          // A new session may only begin with an `initialize` request that
          // carries no session id.
          if (sessionId || !isInitializeRequest(body)) {
            badRequest(res, "Bad Request: no valid session ID or not an initialize request");
            return;
          }
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id) => {
              transports.set(id, transport!);
            },
          });
          transport.onclose = () => {
            if (transport!.sessionId) transports.delete(transport!.sessionId);
          };
          const server = new McpServer({ name: "yours-fairy-tale-agent", version: "0.1.0" });
          toolCount = registerTools(server).length;
          await server.connect(transport);
        }

        await transport.handleRequest(req, res, body);
        return;
      }

      // GET (SSE stream) and DELETE (session teardown) require an existing session.
      const transport = sessionId ? transports.get(sessionId) : undefined;
      if (!transport) {
        badRequest(res, "Bad Request: missing or unknown session ID");
        return;
      }
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("[agent-mcp] request error:", err);
      if (!res.headersSent) res.writeHead(500).end();
    }
  });

  const port = Number(process.env.AGENT_MCP_PORT ?? 39199);
  http.listen(port, () => {
    // stderr only — stdout is reserved (Payload logs there; MCP HTTP body is separate).
    console.error(`[agent-mcp] listening on http://localhost:${port}/mcp — ${toolCount || 16} tools`);
  });
}

main().catch((err) => {
  console.error("[agent-mcp] failed to start:", err);
  process.exit(1);
});
