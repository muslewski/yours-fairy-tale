import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Layer B — the customer dashboard (/app) rendered by order status.
 *
 * Runs in the default `chromium` project, which carries the authed
 * storageState (e2e/.auth/customer.json) for e2e-customer@example.com. We do
 * NOT opt out of it — these specs need to be signed in.
 *
 * Fixtures are staged out-of-process through the seed runner: we cannot import
 * e2e/fixtures/seed.ts into a Playwright spec (Payload's ESM/aliased config
 * crashes Playwright's transpiler), so we shell out to Vitest with the scoped
 * config, exactly as the auth fixture does. Env vars hand the runner the email,
 * status, and child name; the runner seeds one order for that customer.
 */
function seedOrderViaRunner(status: string, child: string) {
  execFileSync(
    "node",
    [
      "--env-file=.env.test",
      "./node_modules/vitest/vitest.mjs",
      "run",
      "--config",
      "e2e/fixtures/seed.vitest.config.ts",
    ],
    {
      env: {
        ...process.env,
        E2E_SEED_EMAIL: "e2e-customer@example.com",
        E2E_SEED_STATUS: status,
        E2E_SEED_CHILD: child,
      },
      stdio: "inherit",
    },
  );
}

test("@layerB dashboard shows a seeded in_production order with the right stage + message", async ({
  page,
}) => {
  seedOrderViaRunner("in_production", "Ada");
  await page.goto("/app");

  // Each order card is now a Link (role "link") wrapping the whole summary.
  const card = page
    .getByRole("link")
    .filter({ hasText: "Ada's fairy tale" })
    .first();
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("list", { name: "Production progress" }),
  ).toBeVisible();
  // "In the studio" is both the active timeline label and the message headline
  // for in_production — its presence proves the right stage is active.
  await expect(card.getByText("In the studio").first()).toBeVisible();
});

test("@layerB a delivered order surfaces the watch/finalize copy", async ({
  page,
}) => {
  seedOrderViaRunner("delivered", "Bo");
  await page.goto("/app");

  const card = page
    .getByRole("link")
    .filter({ hasText: "Bo's fairy tale" })
    .first();
  await expect(card).toBeVisible();
  // delivered → the card renders the timeline (final label "Ready to watch")
  // and the "...fairy tale is ready" headline. The invite-to-watch body copy now
  // lives on the detail page, so we assert on what the CARD still shows.
  await expect(
    card.getByText(/Ready to watch|fairy tale is ready/i).first(),
  ).toBeVisible();
});

test("@layerB order detail page shows full details and accepts a studio note", async ({
  page,
}) => {
  seedOrderViaRunner("in_production", "Cy");
  await page.goto("/app");

  // The whole card is a link to /app/orders/{id}; clicking it navigates in.
  await page
    .getByRole("link")
    .filter({ hasText: "Cy's fairy tale" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/app\/orders\//);

  // The detail page surfaces the full picture: heading + the studio notes thread.
  await expect(
    page.getByRole("heading", { name: "Cy's fairy tale" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Notes for our studio" }),
  ).toBeVisible();

  // Add a note: open the dialog, write a unique message, send it to the studio.
  const noteText = `A note ${Date.now()}`;
  await page.getByRole("button", { name: "Add a note" }).click();
  // Scope to the dialog — a footer email field also exposes a textbox role.
  const dialog = page.getByRole("dialog", { name: "Add a note for the studio" });
  await dialog.getByRole("textbox").fill(noteText);
  await dialog.getByRole("button", { name: "Send to the studio" }).click();

  // After the server round-trip the note appears in the thread (auto-waited).
  await expect(page.getByText(noteText)).toBeVisible();
});
