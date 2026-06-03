import { expect, test } from "vitest";
import { getPayloadClient } from "@/lib/payload";

test("orders status enum defaults to 'paid' and round-trips with an owner", async () => {
  const p = await getPayloadClient();
  const slugs = p.config.collections.map((c: { slug: string }) => c.slug);
  expect(slugs).toEqual(expect.arrayContaining(
    ["users","accounts","sessions","verifications","orders","media"]));
  const user = await p.create({ collection: "users", data: { email: `t-${Date.now()}@x.io`, emailVerified: false } });
  const order = await p.create({ collection: "orders", data: { owner: user.id, childName: "Ada", world: "space" } });
  expect(order.status).toBe("paid");
});
