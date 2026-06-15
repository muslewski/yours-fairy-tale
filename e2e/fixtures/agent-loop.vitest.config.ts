import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest config used ONLY by e2e/agent-loop.spec.ts to create an order
 * and mint a login link out-of-process (the same pattern as seed.vitest.config.ts).
 *
 * Playwright's transpiler cannot import Payload-dependent modules directly — its
 * CJS output crashes on Payload's ESM-only config + `@/` aliases. Vitest's loader
 * is the proven boot path on this stack.
 *
 * Env (DATABASE_URI → Neon test branch, BETTER_AUTH_URL, etc.) is supplied by
 * `node --env-file=.env.test` at the call site in the spec.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@payload-config": fileURLToPath(
        new URL("../../payload.config.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("../../", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["e2e/fixtures/agent-loop.runner.ts"],
    testTimeout: 120_000,
  },
});
