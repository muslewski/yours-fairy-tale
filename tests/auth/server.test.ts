/**
 * Auth server smoke-tests.
 *
 * These assert the three invariants that define our auth model:
 *  1. `auth.api.getSession` exists — the instance is a valid BA server object.
 *  2. `emailAndPassword` is NOT enabled — no password sign-up or sign-in.
 *  3. The magic-link plugin is registered AND `disableSignUp: true` is set —
 *     only webhook-created users (future Stripe task) can receive a magic link.
 */
import { expect, test } from "vitest";
import { auth } from "@/lib/auth";

test("auth.api.getSession is a function", () => {
  expect(typeof auth.api.getSession).toBe("function");
});

test("emailAndPassword is NOT enabled", () => {
  // Our model is magic-link only. The `emailAndPassword` key should be absent
  // or falsy on auth.options.
  const epOptions = (auth.options as Record<string, unknown>).emailAndPassword;
  // Either undefined or { enabled: false/undefined }
  const enabled =
    epOptions != null &&
    typeof epOptions === "object" &&
    (epOptions as Record<string, unknown>).enabled === true;
  expect(enabled).toBe(false);
});

test("magic-link plugin is registered with disableSignUp: true", () => {
  const plugins = auth.options.plugins ?? [];
  // The magic-link plugin exposes `id: "magic-link"` on its return value.
  // BA preserves the plugin objects in auth.options.plugins so we can inspect them.
  const magicLinkPlugin = plugins.find(
    (p) => (p as Record<string, unknown>).id === "magic-link",
  );
  expect(magicLinkPlugin).toBeDefined();

  // Confirm disableSignUp is set to true on the plugin's options object.
  // BA's magicLink() returns { id, options, endpoints, ... } where `options`
  // is the raw MagicLinkOptions passed by the caller.
  const pluginOptions = (magicLinkPlugin as Record<string, unknown>).options as
    | Record<string, unknown>
    | undefined;
  expect(pluginOptions?.disableSignUp).toBe(true);
});

test("trustedOrigins never trusts all of vercel.app", () => {
  const origins = auth.options.trustedOrigins as string[];
  expect(origins).not.toContain("https://*.vercel.app");
  for (const o of origins) expect(o).not.toMatch(/\*/);
});
