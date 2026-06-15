/**
 * Hard safety invariant: the agent harness may operate ONLY against the Neon
 * test branch. This runs at boot before Payload is imported; if any check fails
 * the server never starts. Pure + synchronous so it is unit-testable.
 */
export function assertTestDatabase(): void {
  const uri = process.env.DATABASE_URI ?? process.env.POSTGRES_URL ?? "";
  if (!uri) {
    throw new Error(
      "[agent-mcp] No DATABASE_URI/POSTGRES_URL set — refusing to start.",
    );
  }
  // Refuse on ANY non-local Vercel environment (production AND preview): the
  // harness mutates/resets data and must never touch a deployed DB.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "development") {
    throw new Error(
      `[agent-mcp] VERCEL_ENV=${process.env.VERCEL_ENV} — refusing to run outside local development.`,
    );
  }
  if (process.env.AGENT_MCP_CONFIRM_TEST_DB !== "1") {
    throw new Error(
      "[agent-mcp] AGENT_MCP_CONFIRM_TEST_DB must be '1' (set it in .env.test) — " +
        "refusing to start against an unconfirmed database.",
    );
  }
}
