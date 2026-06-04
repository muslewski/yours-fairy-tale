/**
 * The order-confirmation "track your order" link is minted by us but must be
 * consumable by Better Auth's REAL verify endpoint. This drives a generated link
 * through `auth.api.magicLinkVerify`, so any drift in BA's verification format
 * (token shape, value JSON, storage) breaks this test immediately.
 */
import { test, expect } from "vitest";
import { getPayloadClient } from "@/lib/payload";
import { auth } from "@/lib/auth";
import { createOrderTrackingLink } from "@/lib/order-tracking-link";

const HEADERS = { origin: "http://localhost:3000" };

test("tracking link lands on the scanner-safe interstitial", async () => {
  const link = await createOrderTrackingLink({
    email: "x@example.com",
    baseUrl: "http://localhost:3000",
  });
  const u = new URL(link);
  expect(u.pathname).toBe("/sign-in/verify");
  expect(u.searchParams.get("token")).toBeTruthy();
  expect(u.searchParams.get("callbackURL")).toBe("/app");
});

test("tracking link verifies through Better Auth and signs the user in", async () => {
  const email = `track-${Date.now()}@example.com`;
  const p = await getPayloadClient();
  await p.create({
    collection: "users",
    data: { email, emailVerified: true } as never,
    overrideAccess: true,
  });

  const link = await createOrderTrackingLink({ email, baseUrl: "http://localhost:3000" });
  const token = new URL(link).searchParams.get("token")!;

  const res: Response = await auth.api.magicLinkVerify({
    query: { token, callbackURL: "/app" },
    headers: HEADERS,
    asResponse: true,
  });
  // No error → the token was accepted and a session was created for the user.
  expect(res.headers.get("location") ?? "").not.toContain("error=");
});
