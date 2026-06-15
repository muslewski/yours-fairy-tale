import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

/**
 * Layer B — end-to-end agent loop.
 *
 * Exercises the agent harness the way an AI agent would use it: materialise an
 * order via createOrder, mint a magic login link via mintLoginLink, follow the
 * link to authenticate, land on the real success_url, and confirm the order
 * appears on the customer dashboard.
 *
 * Why out-of-process (execFileSync + vitest)? Playwright's CJS transpiler
 * crashes on Payload's ESM-only config + `@/` aliases. Vitest's loader is the
 * one boot path proven on this stack, exactly as in dashboard.spec.ts and
 * e2e/fixtures/auth.ts. The runner writes its result to a temp file; we read
 * it back before driving the browser.
 *
 * The magic link lands on /sign-in/verify (the scanner-safe interstitial, see
 * lib/auth-confirm-url.ts). A "Confirm sign-in" button press completes auth,
 * matching the flow in e2e/fixtures/auth.ts.
 */

// Layer B: DB-backed against the Neon test branch. Opt out of the shared
// authed storageState — this spec mints its own session.
test.use({ storageState: { cookies: [], origins: [] } });

test(
  "@layerB agent loop: create_order -> mint_login_link -> success landing shows the order",
  async ({ page, baseURL }) => {
    const base = baseURL ?? "http://localhost:3100";
    const email = `agent-loop-${Date.now()}@x.io`;

    // Write the result to a temp file so the Playwright process can read it.
    const tmpDir = mkdtempSync(join(tmpdir(), "agent-loop-"));
    const outFile = join(tmpDir, "result.json");
    try {
      // Run createOrder + mintLoginLink out-of-process through Vitest's loader,
      // which is the only path that can boot the Payload Local API here.
      execFileSync(
        "node",
        [
          "--env-file=.env.test",
          "./node_modules/vitest/vitest.mjs",
          "run",
          "--config",
          "e2e/fixtures/agent-loop.vitest.config.ts",
        ],
        {
          env: {
            ...process.env,
            AGENT_LOOP_EMAIL: email,
            AGENT_LOOP_CHILD: "Ada",
            AGENT_LOOP_BASE_URL: base,
            AGENT_LOOP_OUT_FILE: outFile,
          },
          stdio: "inherit",
        },
      );

      const { order, loginLink } = JSON.parse(
        readFileSync(outFile, "utf8"),
      ) as { order: { sessionId: string }; loginLink: string };

      // Follow the magic link — lands on /sign-in/verify (the confirmation
      // interstitial that keeps scanner bots from burning the token on GET).
      await page.goto(loginLink);
      await page.getByRole("button", { name: /confirm sign.in/i }).click();
      // Wait for the magic-link verify redirect to land on /app and set the
      // session cookie before navigating away (mirrors e2e/fixtures/auth.ts).
      await expect(page).toHaveURL(/\/app(\b|\/|\?|$)/);

      // Navigate to the real success_url — this mirrors Stripe's post-checkout
      // redirect (success_url). The app currently ignores the `session` param and
      // shows the generic order list; that post-success-confirmation gap is exactly
      // what this harness surfaces.
      await page.goto(`/app?session=${encodeURIComponent(order.sessionId)}`);

      // The order is visible on the dashboard.
      await expect(page.getByText(/Ada/i)).toBeVisible();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  },
);
