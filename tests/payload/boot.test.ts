import { expect, test } from "vitest";
import { getPayloadClient } from "@/lib/payload";

test("payload boots, connects to the DB, and admins is auth-enabled", async () => {
  const p = await getPayloadClient();
  const admins = p.config.collections.find((c) => c.slug === "admins");
  expect(admins?.auth).toBeTruthy();
  // proves DB connectivity + schema push (dev):
  const res = await p.count({ collection: "admins" });
  expect(typeof res.totalDocs).toBe("number");
});
