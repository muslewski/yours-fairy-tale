"use server";

/**
 * Studio actions — server-only mutations the /studio panel calls.
 *
 * SECURITY (non-negotiable): every export of a "use server" module becomes a
 * POST-reachable server action, so this file exports ONLY the guarded actions,
 * and each begins with `requireStudioUserOrRedirect()` (lib/studio-auth.ts) —
 * signed-in staff mutate. The auth-skipping cores live in
 * lib/studio-order-mutations.ts (no "use server") precisely so the Next.js
 * compiler can never register them as client-invokable actions.
 */
import { revalidatePath } from "next/cache";

import { getPayloadClient } from "@/lib/payload";
import { requireStudioUserOrRedirect } from "@/lib/studio-auth";
import {
  applyDeliveryUrlCore,
  applyOrderStatusCore,
  applyPromisedByCore,
  attachVideoCore,
  type StudioActionResult,
  type VideoKind,
} from "@/lib/studio-order-mutations";
import { isBlobStorageEnabled } from "@/lib/video-access";
import type { OrderStatus } from "@/lib/order-stages";

const GENERIC_ERROR =
  "Something went wrong while saving. Please try again in a moment.";

function revalidateStudioAndCustomer(orderId: string) {
  revalidatePath("/studio");
  revalidatePath("/studio/orders");
  revalidatePath(`/studio/orders/${orderId}`);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}

/** Action: staff sets an order's status (guardrails enforced in the core). */
export async function setOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StudioActionResult> {
  await requireStudioUserOrRedirect();
  try {
    const result = await applyOrderStatusCore(orderId, nextStatus);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setOrderStatus failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Action: staff adjusts the delivery promise shown to the parent. */
export async function setPromisedBy(
  orderId: string,
  promisedByIso: string | null,
): Promise<StudioActionResult> {
  await requireStudioUserOrRedirect();
  try {
    const result = await applyPromisedByCore(orderId, promisedByIso);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setPromisedBy failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Action: staff set/clear the external delivery link for the preview or final film. */
export async function setDeliveryUrl(
  orderId: string,
  kind: VideoKind,
  rawUrl: string | null,
): Promise<StudioActionResult> {
  await requireStudioUserOrRedirect();
  try {
    const result = await applyDeliveryUrlCore(orderId, kind, rawUrl);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setDeliveryUrl failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Action: after the browser finishes a direct-to-Blob upload, verify the blob
 * really exists (head by pathname — same resolution the playback proxy uses)
 * and attach it. Replacing simply links a new media doc; the old blob stays
 * orphaned and invisible (cleanup is a filed tech-debt note).
 */
export async function attachUploadedVideo(args: {
  orderId: string;
  kind: VideoKind;
  pathname: string;
}): Promise<StudioActionResult> {
  await requireStudioUserOrRedirect();
  try {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blob;
    try {
      blob = await head(args.pathname);
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return {
          ok: false,
          error: "We could not find that upload. Please try again.",
        };
      }
      throw err;
    }
    const result = await attachVideoCore({
      orderId: args.orderId,
      kind: args.kind,
      blob: {
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: blob.size,
      },
    });
    if (result.ok) revalidateStudioAndCustomer(args.orderId);
    return result;
  } catch (err) {
    console.error("[studio] attachUploadedVideo failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Action: dev fallback when no Blob token is configured — a plain server-side
 * upload into Payload's local-disk media storage. Local only: no request-body
 * cap applies off Vercel. Mirrors the dual-path convention in lib/video-access.
 */
export async function uploadVideoDirect(
  orderId: string,
  kind: VideoKind,
  formData: FormData,
): Promise<StudioActionResult> {
  await requireStudioUserOrRedirect();
  if (kind !== "proof" && kind !== "finalVideo") {
    return { ok: false, error: "Unknown video slot." };
  }
  if (isBlobStorageEnabled()) {
    return {
      ok: false,
      error: "Direct upload is a local-dev fallback. Use the browser upload.",
    };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a video file." };
  }
  if (!file.type.startsWith("video/")) {
    return { ok: false, error: "That file is not a video." };
  }

  try {
    const payload = await getPayloadClient();
    const media = await payload.create({
      collection: "media",
      data: {},
      file: {
        data: Buffer.from(await file.arrayBuffer()),
        name: file.name,
        mimetype: file.type,
        size: file.size,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { [kind]: media.id },
      overrideAccess: true,
    });
    revalidateStudioAndCustomer(orderId);
    return { ok: true };
  } catch (err) {
    console.error("[studio] uploadVideoDirect failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
