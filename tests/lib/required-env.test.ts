import { expect, test } from "vitest";

import { missingProductionEnv, REQUIRED_PRODUCTION_ENV } from "@/lib/required-env";

test("returns every missing var", () => {
  expect(missingProductionEnv({})).toEqual([...REQUIRED_PRODUCTION_ENV]);
});

test("returns empty when all present", () => {
  const env = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((k) => [k, "set"]));
  expect(missingProductionEnv(env)).toEqual([]);
});

test("empty string counts as missing", () => {
  const env = Object.fromEntries(REQUIRED_PRODUCTION_ENV.map((k) => [k, "set"]));
  env.RESEND_API_KEY = "";
  expect(missingProductionEnv(env)).toEqual(["RESEND_API_KEY"]);
});
