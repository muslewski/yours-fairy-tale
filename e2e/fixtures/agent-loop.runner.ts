import { writeFileSync } from "node:fs";

import { test } from "vitest";

import { createOrder } from "@/tools/agent-mcp/tools/orders";
import { mintLoginLink } from "@/tools/agent-mcp/tools/auth";

/**
 * Agent-loop seed runner — invoked out-of-process by e2e/agent-loop.spec.ts via
 * `vitest run --config e2e/fixtures/agent-loop.vitest.config.ts`.
 *
 * Vitest + vite-node is the only loader on this stack that can boot the Payload
 * Local API (Playwright's transpiler crashes on Payload's ESM-only config + `@/`
 * aliases). This mirrors how dashboard.spec.ts and auth.ts shell out to the seed
 * runner. The result is written to the AGENT_LOOP_OUT_FILE path so Playwright can
 * read it back.
 *
 * Env vars consumed:
 *   AGENT_LOOP_EMAIL      — unique per-run email for the order owner
 *   AGENT_LOOP_CHILD      — child name to embed in the order (default "Ada")
 *   AGENT_LOOP_BASE_URL   — base URL for the magic link (default http://localhost:3100)
 *   AGENT_LOOP_OUT_FILE   — absolute path to write the JSON result
 */
test("agent-loop: create order + mint login link", async () => {
  const email = process.env.AGENT_LOOP_EMAIL;
  if (!email) throw new Error("AGENT_LOOP_EMAIL is required");

  const outFile = process.env.AGENT_LOOP_OUT_FILE;
  if (!outFile) throw new Error("AGENT_LOOP_OUT_FILE is required");

  const childName = process.env.AGENT_LOOP_CHILD ?? "Ada";
  const baseUrl = process.env.AGENT_LOOP_BASE_URL ?? "http://localhost:3100";

  const order = await createOrder({
    email,
    childName,
    world: "space",
    length: "short",
    detailLevel: "detailed",
  });

  const loginLink = await mintLoginLink(email, baseUrl);

  const result = { order, loginLink };
  writeFileSync(outFile, JSON.stringify(result));
  console.log(
    `[agent-loop.runner] order=${order.orderId} sessionId=${order.sessionId}`,
  );
});
