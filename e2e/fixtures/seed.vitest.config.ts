import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * Dedicated Vitest config used ONLY by the Playwright auth fixture to seed the
 * test customer (e2e/fixtures/auth.ts → execFileSync).
 *
 * Why a separate config: the seed runner must boot the Payload Local API, and
 * Vitest's loader is the one path proven to do so on this stack (Payload's
 * ESM-only config + the `@/`/`@payload-config` aliases crash Playwright's own
 * transpiler and bare Node). We scope `include` to just the runner so this is
 * never part of `npm test`, and so the runner file needs no magic name.
 *
 * Env (DATABASE_URI → Neon test branch, etc.) is supplied by
 * `node --env-file=.env.test` in the fixture, so no setupFiles here.
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
    include: ["e2e/fixtures/seed.runner.ts"],
    testTimeout: 120_000,
  },
});
