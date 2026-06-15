import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { expect, test } from "vitest";

import { registerTools } from "@/tools/agent-mcp/register";

test("registerTools wires every lifecycle tool onto the server", () => {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  const names = registerTools(server);
  for (const expected of [
    "create_order", "get_order", "list_orders", "get_checkout_intent",
    "upload_photos", "approve_proof", "request_proof_change", "add_customer_note",
    "set_status", "attach_proof", "attach_final_video", "set_promised_by",
    "simulate_refund", "simulate_dispute",
    "mint_login_link", "reset_test_db",
  ]) {
    expect(names).toContain(expected);
  }
});
