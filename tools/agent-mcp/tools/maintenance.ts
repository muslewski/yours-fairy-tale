import { getPayloadClient } from "@/lib/payload";

/**
 * Prune harness-created data so runs are isolated. Targets orders whose
 * stripeSessionId marks them harness-created (cs_agent_ / cs_seed_). Test-branch
 * only (the boot guard guarantees this).
 */
export async function resetTestDb(): Promise<{ orders: number }> {
  const payload = await getPayloadClient();
  const result = await payload.delete({
    collection: "orders",
    where: {
      or: [
        { stripeSessionId: { contains: "cs_agent_" } },
        { stripeSessionId: { contains: "cs_seed_" } },
      ],
    },
    overrideAccess: true,
  });
  const docs = Array.isArray(result.docs) ? result.docs.length : 0;
  return { orders: docs };
}
