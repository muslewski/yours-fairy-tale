import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Mirrors e2e/fixtures/seed.vitest.config.ts: Payload's ESM-only config and the
// `@/` / `@payload-config` aliases crash bare Node + tsx; Vite's loader is the
// one path proven to boot the Payload Local API on this stack.
export default defineConfig({
  resolve: {
    alias: {
      "@payload-config": fileURLToPath(
        new URL("../../payload.config.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("../../", import.meta.url)),
    },
  },
});
