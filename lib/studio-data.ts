/**
 * Studio data bridge — server-only reads for the staff panel.
 * All orders, no owner scoping (the studio sees everything).
 *
 * SECURITY: each helper guards ITSELF with requireStudioUser() — the (gated)
 * layout is only a navigation gate (layouts do not re-run on client-side
 * transitions), so the data layer is the boundary, same as the mutations in
 * lib/studio-actions.ts.
 */
import { requireStudioUser } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";
import type { StudioOrder } from "@/lib/studio-workflow";

/** Every order, newest first. Tiny volume — pagination off, like the customer read. */
export async function getAllOrders(): Promise<StudioOrder[]> {
  await requireStudioUser();
  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: "orders",
    overrideAccess: true,
    depth: 0,
    pagination: false,
    sort: "-createdAt",
  });
  return result.docs as unknown as StudioOrder[];
}
