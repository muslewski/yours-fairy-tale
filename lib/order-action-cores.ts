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

/**
 * Attach pre-checkout photos (already in Vercel Blob) to an order as metadata-only
 * media docs (filename == blob pathname, same contract as attachVideoCore). Reads
 * each blob's content-type/size via head(). Non-fatal per pathname: a missing or
 * non-image blob is skipped, never fails the order. Returns the count attached.
 */
export async function attachCheckoutAssets(
  orderId: string,
  pathnames: string[],
): Promise<number> {
  if (pathnames.length === 0) return 0;
  const { head } = await import("@vercel/blob");
  const payload = await getPayloadClient();

  const newIds: string[] = [];
  for (const pathname of pathnames.slice(0, 6)) {
    // Scope guard (IDOR defense-in-depth): only attach blobs from the public
    // configurator upload prefix. assetPaths arrives via client-controlled
    // checkout metadata, so without this a buyer could pass another order's /
    // customer's blob pathname and have it attached to (and then viewable on)
    // their own order. The upload token route enforces the same prefix; we
    // re-enforce it here at the sink.
    if (!pathname.startsWith("configurator/")) continue;
    try {
      const blob = await head(pathname);
      if (!blob.contentType?.startsWith("image/")) continue;
      const media = await payload.create({
        collection: "media",
        data: { filename: pathname, mimeType: blob.contentType, filesize: blob.size },
        overrideAccess: true,
      });
      newIds.push(String(media.id));
    } catch (err) {
      console.error(`[webhook] skipped asset ${pathname}:`, err);
    }
  }
  if (newIds.length === 0) return 0;

  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });
  const existing = Array.isArray(order.assets)
    ? order.assets.map((a) =>
        typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
      )
    : [];
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { assets: [...existing, ...newIds] },
    overrideAccess: true,
  });
  return newIds.length;
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
