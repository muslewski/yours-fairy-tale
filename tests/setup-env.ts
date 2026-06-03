// Vitest does not auto-load `.env`. Payload needs DATABASE_URI / PAYLOAD_SECRET
// at boot, so load them here before any test imports the Payload config.
// `process.loadEnvFile` is built into Node (no `dotenv` dependency required).
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
