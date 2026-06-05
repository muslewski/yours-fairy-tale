import { describe, expect, test } from "vitest";

import { shouldRunMigrations } from "@/lib/run-migrations";

/**
 * The guard is the safety-critical part: migrations must run ONLY on the
 * production Node runtime. Preview deploys share the prod POSTGRES_URL, so a
 * preview (or edge, or local) run must never reach the migrate call.
 */
describe("shouldRunMigrations", () => {
  test("true only on the Node runtime in production", () => {
    expect(shouldRunMigrations({ runtime: "nodejs", vercelEnv: "production" })).toBe(true);
  });

  test("false on the edge runtime even in production", () => {
    expect(shouldRunMigrations({ runtime: "edge", vercelEnv: "production" })).toBe(false);
  });

  test("false for preview deployments (which share the prod DB)", () => {
    expect(shouldRunMigrations({ runtime: "nodejs", vercelEnv: "preview" })).toBe(false);
  });

  test("false when VERCEL_ENV is unset (local dev)", () => {
    expect(shouldRunMigrations({ runtime: "nodejs", vercelEnv: undefined })).toBe(false);
  });
});
