/**
 * Studio auth bridge tests — DB-backed: creates a real admin, logs in via the
 * Local API to mint a real payload-token, and resolves it through
 * getStudioUserFromHeaders. Customer (Better Auth) cookies and garbage tokens
 * must resolve to null — the studio gate trusts admins ONLY.
 */
import { describe, expect, test } from "vitest";

import { getStudioUserFromHeaders } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";

async function seedAdminWithToken() {
  const payload = await getPayloadClient();
  const email = `studio-auth-${Date.now()}@example.com`;
  const password = `pw-${Date.now()}-secret`;
  const admin = await payload.create({
    collection: "admins",
    data: { email, password, name: "Studio Test Admin" },
    overrideAccess: true,
  });
  const login = await payload.login({
    collection: "admins",
    data: { email, password },
  });
  if (!login.token) throw new Error("login returned no token");
  return { id: admin.id, email, token: login.token };
}

describe("getStudioUserFromHeaders", () => {
  test("a real admins token resolves to the staff user", async () => {
    const { id: adminId, email, token } = await seedAdminWithToken();
    try {
      const user = await getStudioUserFromHeaders(
        new Headers({ cookie: `payload-token=${token}` }),
      );
      expect(user).not.toBeNull();
      expect(user?.email).toBe(email);
    } finally {
      await (await getPayloadClient()).delete({ collection: "admins", id: adminId, overrideAccess: true }).catch(() => {});
    }
  });

  test("no cookie → null", async () => {
    expect(await getStudioUserFromHeaders(new Headers())).toBeNull();
  });

  test("a Better Auth customer cookie → null", async () => {
    const user = await getStudioUserFromHeaders(
      new Headers({ cookie: "better-auth.session_token=not-a-payload-token" }),
    );
    expect(user).toBeNull();
  });

  test("a garbage payload-token → null", async () => {
    const user = await getStudioUserFromHeaders(
      new Headers({ cookie: "payload-token=garbage.token.value" }),
    );
    expect(user).toBeNull();
  });
});
