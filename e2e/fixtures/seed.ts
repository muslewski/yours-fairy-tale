import { getPayloadClient } from "@/lib/payload";
import type { OrderStatus } from "@/lib/order-stages";

export async function seedCustomer(email: string) {
  const p = await getPayloadClient();
  const found = await p.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  if (found.totalDocs > 0) return found.docs[0];
  return p.create({
    collection: "users",
    data: { email, emailVerified: true },
    overrideAccess: true,
  });
}

export async function seedAdmin(email: string, password: string) {
  const p = await getPayloadClient();
  const found = await p.find({
    collection: "admins",
    where: { email: { equals: email } },
    limit: 1,
    overrideAccess: true,
  });
  if (found.totalDocs > 0) return found.docs[0];
  return p.create({
    collection: "admins",
    data: { email, password, name: "E2E Studio Admin" },
    overrideAccess: true,
  });
}

export async function seedOrder(
  ownerId: string | number,
  status: OrderStatus,
  childName = "Ada",
) {
  const p = await getPayloadClient();
  return p.create({
    collection: "orders",
    data: {
      owner: ownerId,
      status,
      childName,
      world: "space",
      stripeSessionId: `cs_seed_${status}_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
    },
    overrideAccess: true,
  });
}
