import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Mirrors e2e/fixtures/seed.vitest.config.ts: Payload's ESM-only config and the
// `@/` / `@payload-config` aliases crash bare Node + tsx; Vite's loader is the
// one path proven to boot the Payload Local API on this stack.
export default defineConfig({
  // SECURITY: keep Vitest's auto dotenv loader away from the repo root, where
  // `.env.local` holds the PROD Neon creds (POSTGRES_URL) and VERCEL_ENV=production.
  // This dir has no `.env*` files, so the only env the harness sees is the one
  // bootstrap-env loads explicitly via process.loadEnvFile(.env.test) — the Neon
  // test branch. Without this, the prod connection string leaks into process.env.
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  resolve: {
    alias: {
      "@payload-config": fileURLToPath(
        new URL("../../payload.config.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("../../", import.meta.url)),
    },
  },
});
