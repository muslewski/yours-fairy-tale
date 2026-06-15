/**
 * Headless customer-action cores. NO "use server" here ON PURPOSE: Next registers
 * every async export of a "use server" module as a POST-reachable server action.
 * These cores skip the ownership guard (assertOwnsOrder) and revalidatePath so
 * they are safe to call from DB tests and the agent harness; the public actions
 * in lib/order-actions.ts wrap them with the guard + revalidation. Mirrors the
 * studio split in lib/studio-order-mutations.ts.
 */
import { getPayloadClient } from "@/lib/payload";
import { isServerAcceptedImage } from "@/lib/order-upload-validation";

export interface UploadFileSpec {
  data: Buffer;
  name: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  added: number;
  error?: string;
}

/** Append photos to an order's `assets`; first photos advance awaiting_assets -> in_production. */
export async function uploadOrderAssetsCore(
  orderId: string,
  files: UploadFileSpec[],
): Promise<UploadResult> {
  if (files.length === 0) {
    return { added: 0, error: "Please choose at least one photo to add." };
  }
  for (const file of files) {
    if (!isServerAcceptedImage(file.mimetype)) {
      return {
        added: 0,
        error: `"${file.name}" is in a format we can't process. Please use a JPEG or PNG.`,
      };
    }
  }

  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });

  const newAssetIds: string[] = [];
  for (const file of files) {
    const media = await payload.create({
      collection: "media",
      data: {},
      file: { data: file.data, name: file.name, mimetype: file.mimetype, size: file.size },
      overrideAccess: true,
    });
    newAssetIds.push(String(media.id));
  }

  const existing = Array.isArray(order.assets)
    ? order.assets.map((a) =>
        typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
      )
    : [];
  const nextStatus = order.status === "awaiting_assets" ? "in_production" : order.status;

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { assets: [...existing, ...newAssetIds], status: nextStatus },
    overrideAccess: true,
  });

  return { added: newAssetIds.length };
}

/** Set an order's status to `approved`. */
export async function approveProofCore(orderId: string): Promise<void> {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: "approved" },
    overrideAccess: true,
  });
}

/** Set an order's status to `revisions` and save the parent's note. */
export async function requestProofChangeCore(orderId: string, note: string): Promise<void> {
  const payload = await getPayloadClient();
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: "revisions", revisionNote: note?.trim() || null },
    overrideAccess: true,
  });
}
