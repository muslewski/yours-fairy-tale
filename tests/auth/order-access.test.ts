/**
 * order-access — DB cores for the durable reusable order link. DB-backed
 * (boots Payload against the Neon test branch).
 *   - ensureOrderAccessToken mints once, then only refreshes expiry (token stable).
 *   - resolveOrderByAccessToken returns the order+owner for a live token, null for
 *     expired / unknown.
 *   - mintEphemeralSignin mints a verification Better Auth's real verify accepts.
 */
import { afterAll, describe, expect, test, vi } from "vitest";

// The afterChange-hook regression test below triggers a real status email; mock
// the transport so no network send happens (the hook's link mint is the part
// under test, not delivery).
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));

import { getPayloadClient } from "@/lib/payload";
import { auth } from "@/lib/auth";
import {
  ensureOrderAccessToken,
  resolveOrderByAccessToken,
  mintEphemeralSignin,
} from "@/lib/order-access";
import { GET as openRoute } from "@/app/(site)/(app)/open/[token]/route";

const created: { collection: "users" | "orders"; id: string }[] = [];

async function seedOrder(email: string) {
  const payload = await getPayloadClient();
  const user = await payload.create({
    collection: "users",
    data: { email, emailVerified: true } as never,
    overrideAccess: true,
  });
  created.push({ collection: "users", id: String(user.id) });
  const order = await payload.create({
    collection: "orders",
    data: { owner: user.id, status: "in_production", childName: "Test 1" },
    overrideAccess: true,
  });
  created.push({ collection: "orders", id: String(order.id) });
  return { payload, order, user };
}

afterAll(async () => {
  const payload = await getPayloadClient();
  for (const d of created.reverse()) {
    await payload.delete({ collection: d.collection, id: d.id, overrideAccess: true }).catch(() => {});
  }
});

describe("ensureOrderAccessToken", () => {
  test("mints once, then refreshes expiry but keeps the token", async () => {
    const { payload, order } = await seedOrder(`oa-${Date.now()}-a@example.com`);
    const token1 = await ensureOrderAccessToken(String(order.id));
    expect(token1).toMatch(/^[a-zA-Z]{32}$/);
    const after1 = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    const exp1 = after1.accessTokenExpiresAt as string;

    await new Promise((r) => setTimeout(r, 10));
    const token2 = await ensureOrderAccessToken(String(order.id));
    expect(token2).toBe(token1); // token stable
    const after2 = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    expect(new Date(after2.accessTokenExpiresAt as string).getTime()).toBeGreaterThan(
      new Date(exp1).getTime(),
    ); // expiry refreshed
  });
});

describe("resolveOrderByAccessToken", () => {
  test("live token → { orderId, ownerEmail }", async () => {
    const email = `oa-${Date.now()}-b@example.com`;
    const { order } = await seedOrder(email);
    const token = await ensureOrderAccessToken(String(order.id));
    const resolved = await resolveOrderByAccessToken(token, new Date());
    expect(resolved).toEqual({ orderId: String(order.id), ownerEmail: email });
  });

  test("unknown token → null", async () => {
    expect(await resolveOrderByAccessToken("z".repeat(32), new Date())).toBeNull();
  });

  test("expired token → null", async () => {
    const { payload, order } = await seedOrder(`oa-${Date.now()}-c@example.com`);
    const token = await ensureOrderAccessToken(String(order.id));
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { accessTokenExpiresAt: "2020-01-01T00:00:00.000Z" },
      overrideAccess: true,
    });
    expect(await resolveOrderByAccessToken(token, new Date())).toBeNull();
  });
});

describe("mintEphemeralSignin", () => {
  test("mints a verification Better Auth's real verify accepts", async () => {
    const email = `oa-${Date.now()}-d@example.com`;
    await seedOrder(email);
    const token = await mintEphemeralSignin(email);
    const res: Response = await auth.api.magicLinkVerify({
      query: { token, callbackURL: "/app" },
      headers: { origin: "http://localhost:3000" },
      asResponse: true,
    });
    expect(res.headers.get("location") ?? "").not.toContain("error=");
  });
});

describe("/open/[token] route", () => {
  test("unknown token → 302 to /open/expired", async () => {
    const res = await openRoute(new Request("https://x.test/open/zzz"), {
      params: Promise.resolve({ token: "z".repeat(32) }),
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location") ?? "").toContain("/open/expired");
  });

  test("live token → a session response (no error redirect)", async () => {
    const email = `oa-${Date.now()}-e@example.com`;
    const { order } = await seedOrder(email);
    const token = await ensureOrderAccessToken(String(order.id));
    const res = await openRoute(new Request("https://x.test/open/" + token, { headers: { origin: "https://x.test" } }), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.headers.get("location")).toBeTruthy();
    expect(res.headers.get("location") ?? "").not.toContain("error=");
    expect(res.headers.get("location") ?? "").not.toContain("/open/expired");
  });
});

describe("ensureOrderAccessToken inside the Orders afterChange hook", () => {
  test("advancing to proof_ready persists an accessToken without deadlocking", async () => {
    const { payload, order } = await seedOrder(`oa-${Date.now()}-hook@example.com`);
    // A real status transition fires statusTransitionEmailHook → sendStatusTransitionEmail
    // → ensureOrderAccessToken, which writes THIS order row from inside the hook's
    // transaction. Before req was threaded through, that ran in a separate
    // transaction and deadlocked on the row lock (30s timeout). It must now finish
    // and leave the order with a durable token.
    await payload.update({
      collection: "orders",
      id: order.id,
      data: { status: "proof_ready" },
      overrideAccess: true,
    });
    const after = await payload.findByID({
      collection: "orders",
      id: order.id,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.accessToken).toMatch(/^[a-zA-Z]{32}$/);
    expect(after.accessTokenExpiresAt).toBeTruthy();
  });
});
