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
