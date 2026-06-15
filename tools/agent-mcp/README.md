# Agent order-tooling MCP

Internal debugging harness. Lets agents create/drive/inspect the full order
lifecycle against the **Neon test branch**, composed with the Playwright MCP for UI.

## Safety
- Boots ONLY when `.env.test` exists AND `AGENT_MCP_CONFIRM_TEST_DB=1` is set in it.
- Refuses to run when `VERCEL_ENV=production`.
- Never touches prod; never hits real Stripe (synthesized `livemode:false` events).

## Run
1. Add `AGENT_MCP_CONFIRM_TEST_DB=1` to `.env.test`.
2. Start the app's test server (so Playwright + magic links work): `npm run build && npx next start -p 3100`.
3. Start the MCP server: `npm run agent:mcp` (listens on http://localhost:39199/mcp).
4. The agent connects via `.mcp.json` (HTTP transport).

## Tools
create_order, get_order, list_orders, get_checkout_intent, upload_photos,
approve_proof, request_proof_change, add_customer_note, set_status, attach_proof,
attach_final_video, set_promised_by, simulate_refund, simulate_dispute,
mint_login_link, reset_test_db.

HTTP transport is used (not stdio) because Payload logs to stdout.
