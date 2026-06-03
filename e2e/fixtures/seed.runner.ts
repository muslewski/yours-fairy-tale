import { test } from "vitest";

import { seedCustomer, seedOrder } from "./seed";
import type { OrderStatus } from "@/lib/order-stages";

/**
 * Seed runner — invoked out-of-process by the Playwright auth fixture and the
 * dashboard spec via `vitest run --config e2e/fixtures/seed.vitest.config.ts`.
 * Vitest is the only loader on this stack that can boot the Payload Local API
 * (see that config's header). The email is passed through E2E_SEED_EMAIL.
 *
 * Two modes, both driven by env vars:
 *   • Always: ensure the E2E_SEED_EMAIL customer exists (the auth fixture's
 *     only need — it never sets E2E_SEED_STATUS).
 *   • Optionally: when E2E_SEED_STATUS is set, also seed one order for that
 *     customer with the given status and (optional) E2E_SEED_CHILD name. This
 *     is what the Layer B dashboard spec uses to stage per-status fixtures.
 *
 * Not part of `npm test`: the dedicated config's `include` scopes Vitest to
 * this file only, and the default suite never references this config.
 */
test("seed the e2e customer", async () => {
  const email = process.env.E2E_SEED_EMAIL;
  if (!email) throw new Error("E2E_SEED_EMAIL is required");
  const user = await seedCustomer(email);
  console.log(`[seed.runner] seeded customer ${user.id} <${email}>`);

  const status = process.env.E2E_SEED_STATUS as OrderStatus | undefined;
  if (status) {
    const child = process.env.E2E_SEED_CHILD;
    const order = await seedOrder(user.id, status, child);
    console.log(
      `[seed.runner] seeded order ${order.id} status=${status}` +
        (child ? ` child=${child}` : ""),
    );
  }
});
