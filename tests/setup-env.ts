// Vitest does not auto-load `.env`. Payload needs DATABASE_URI / PAYLOAD_SECRET
// at boot, so load them here before any test imports the Payload config.
// `process.loadEnvFile` is built into Node (no `dotenv` dependency required).
// Prefer `.env.test` (Neon test branch) when it exists, else fall back to `.env`.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envTestPath = fileURLToPath(new URL("../.env.test", import.meta.url));
const envPath = fileURLToPath(new URL("../.env", import.meta.url));
const resolvedEnvPath = existsSync(envTestPath) ? envTestPath : envPath;
if (existsSync(resolvedEnvPath)) {
  process.loadEnvFile(resolvedEnvPath);
}

// Better Auth builds/verifies magic-link URLs from a base URL. Unit tests call
// auth.api directly (no HTTP request to infer the host from), so default one.
// This is vitest-only — Playwright loads .env.test in its own process and the
// e2e server infers the host from the request, so this never reaches it.
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
