import { expect, test } from "vitest";
import { payloadBetterAuthAdapter } from "@/lib/better-auth-payload-adapter";

test("adapter creates and reads a BA user via Payload (uuid id minted by DB)", async () => {
  const adapter = payloadBetterAuthAdapter({} as never); // factory → adapter instance (BA passes its options)
  const email = `t-${Date.now()}@x.io`;
  const created = await adapter.create({
    model: "user",
    data: { email, name: "T", emailVerified: false },
  });
  expect(typeof created.id).toBe("string");
  const found = await adapter.findOne<{ email: string }>({
    model: "user",
    where: [{ field: "email", value: email, operator: "eq" }],
  });
  expect(found?.email).toBe(email);
});
