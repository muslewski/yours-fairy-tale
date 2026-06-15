import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Load ONLY .env.test (the Neon test branch). Never .env. Refuses to proceed if
 * .env.test is absent — the harness must never run against a non-test DB.
 * `process.loadEnvFile` is built into Node (no dotenv dependency).
 */
export function loadAgentEnv(): void {
  const envTestPath = fileURLToPath(new URL("../../.env.test", import.meta.url));
  if (!existsSync(envTestPath)) {
    throw new Error(
      "[agent-mcp] .env.test not found — this harness runs ONLY against the Neon test branch.",
    );
  }
  process.loadEnvFile(envTestPath);
  // Magic links / Better Auth need a base URL; default to the e2e server port.
  process.env.BETTER_AUTH_URL ??= "http://localhost:3100";
}
