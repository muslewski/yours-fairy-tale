import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  createOrder, getCheckoutIntent, getOrder, listOrders,
} from "./tools/orders";
import {
  addCustomerNote, approveProofTool, requestProofChangeTool, uploadPhotos,
} from "./tools/customer";
import {
  attachFinalVideo, attachProof, setPromisedBy, setStatus,
} from "./tools/studio";
import { simulateDispute, simulateRefund } from "./tools/payments";
import { mintLoginLink } from "./tools/auth";
import { resetTestDb } from "./tools/maintenance";

const json = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] });

const STATUS = z.enum([
  "paid", "awaiting_assets", "in_production", "proof_ready",
  "revisions", "approved", "delivered", "refunded", "cancelled",
]);

/** Registers every tool; returns the list of registered names (for tests). */
export function registerTools(server: McpServer): string[] {
  server.tool(
    "create_order",
    {
      email: z.string(),
      childName: z.string().optional(),
      world: z.string().optional(),
      length: z.string().optional(),
      detailLevel: z.string().optional(),
      extraMinutes: z.number().optional(),
      addOns: z.array(z.string()).optional(),
      plotNote: z.string().optional(),
      status: STATUS.optional(),
      mode: z.enum(["webhook", "seed"]).optional(),
    },
    async (args) => json(await createOrder(args)),
  );

  server.tool("get_order", { orderId: z.string() }, async ({ orderId }) => json(await getOrder(orderId)));
  server.tool("list_orders", { email: z.string().optional() }, async ({ email }) => json(await listOrders({ email })));
  server.tool(
    "get_checkout_intent",
    {
      childName: z.string(),
      world: z.string(),
      length: z.string(),
      detail: z.string(),
      extraMinutes: z.number(),
      addOns: z.array(z.string()),
      plotNote: z.string().optional(),
      email: z.string().optional(),
    },
    async (args) => json(getCheckoutIntent(args)),
  );

  server.tool(
    "upload_photos",
    { orderId: z.string(), filePaths: z.array(z.string()) },
    async ({ orderId, filePaths }) => json(await uploadPhotos(orderId, filePaths)),
  );
  server.tool("approve_proof", { orderId: z.string() }, async ({ orderId }) => json(await approveProofTool(orderId)));
  server.tool(
    "request_proof_change",
    { orderId: z.string(), note: z.string() },
    async ({ orderId, note }) => json(await requestProofChangeTool(orderId, note)),
  );
  server.tool(
    "add_customer_note",
    { orderId: z.string(), message: z.string() },
    async ({ orderId, message }) => json(await addCustomerNote(orderId, message)),
  );

  server.tool("set_status", { orderId: z.string(), status: STATUS }, async ({ orderId, status }) => json(await setStatus(orderId, status)));
  server.tool("attach_proof", { orderId: z.string(), pathname: z.string().optional() }, async ({ orderId, pathname }) => json(await attachProof(orderId, pathname)));
  server.tool("attach_final_video", { orderId: z.string(), pathname: z.string().optional() }, async ({ orderId, pathname }) => json(await attachFinalVideo(orderId, pathname)));
  server.tool("set_promised_by", { orderId: z.string(), iso: z.string().nullable() }, async ({ orderId, iso }) => json(await setPromisedBy(orderId, iso)));

  server.tool("simulate_refund", { paymentIntentId: z.string() }, async ({ paymentIntentId }) => json(await simulateRefund(paymentIntentId)));
  server.tool("simulate_dispute", { paymentIntentId: z.string() }, async ({ paymentIntentId }) => json(await simulateDispute(paymentIntentId)));

  server.tool(
    "mint_login_link",
    { email: z.string(), baseUrl: z.string().optional(), callbackURL: z.string().optional() },
    async ({ email, baseUrl, callbackURL }) => json(await mintLoginLink(email, baseUrl, callbackURL)),
  );
  server.tool("reset_test_db", {}, async () => json(await resetTestDb()));

  return [
    "create_order", "get_order", "list_orders", "get_checkout_intent",
    "upload_photos", "approve_proof", "request_proof_change", "add_customer_note",
    "set_status", "attach_proof", "attach_final_video", "set_promised_by",
    "simulate_refund", "simulate_dispute",
    "mint_login_link", "reset_test_db",
  ];
}
