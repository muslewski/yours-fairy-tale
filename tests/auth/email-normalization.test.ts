/**
 * Email is canonicalized to lowercase on write, so Better Auth's lowercased
 * lookup always finds the user — even when the stored email came in mixed-case
 * (e.g. from Stripe checkout). Regression for the prod `new_user_signup_disabled`
 * a mixed-case account hit at sign-in.
 */
import { test, expect } from "vitest";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { getPayloadClient } from "@/lib/payload";
import { auth } from "@/lib/auth";

const LINK = "e2e/.auth/last-magic-link.txt";
const HEADERS = { origin: "http://localhost:3000" };

test("users collection stores email lowercase (field hook)", async () => {
  const p = await getPayloadClient();
  const mixed = `Norm-${Date.now()}@Example.COM`;
  const u = await p.create({
    collection: "users",
    data: { email: mixed, emailVerified: true } as never,
    overrideAccess: true,
  });
  expect((u as unknown as { email: string }).email).toBe(mixed.toLowerCase());
});

test("magic-link sign-in succeeds for a mixed-case email (no new_user_signup_disabled)", async () => {
  process.env.PLAYWRIGHT_TEST = "1"; // capture the link to the file sink
  const email = `Case-${Date.now()}@Example.COM`;
  const p = await getPayloadClient();
  await p.create({
    collection: "users",
    data: { email, emailVerified: true } as never,
    overrideAccess: true,
  });

  if (existsSync(LINK)) rmSync(LINK);
  await auth.api.signInMagicLink({ body: { email, callbackURL: "/app" }, headers: HEADERS });
  const url = readFileSync(LINK, "utf8").trim();
  const token = new URL(url).searchParams.get("token")!;

  const res: Response = await auth.api.magicLinkVerify({
    query: { token, callbackURL: "/app" },
    headers: HEADERS,
    asResponse: true,
  });
  expect(res.headers.get("location") ?? "").not.toContain("error=");
});
