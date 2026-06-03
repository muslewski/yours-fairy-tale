import { test } from "vitest";

import { seedCustomer } from "./seed";

/**
 * Seed runner — invoked out-of-process by the Playwright auth fixture via
 * `vitest run --config e2e/fixtures/seed.vitest.config.ts`. Vitest is the only
 * loader on this stack that can boot the Payload Local API (see that config's
 * header). The email is passed through E2E_SEED_EMAIL.
 *
 * Not part of `npm test`: the dedicated config's `include` scopes Vitest to
 * this file only, and the default suite never references this config.
 */
test("seed the e2e customer", async () => {
  const email = process.env.E2E_SEED_EMAIL;
  if (!email) throw new Error("E2E_SEED_EMAIL is required");
  const user = await seedCustomer(email);
  console.log(`[seed.runner] seeded customer ${user.id} <${email}>`);
});
