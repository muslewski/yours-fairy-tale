/**
 * Server-only: studio order mutation cores. (The `server-only` package is not
 * installed, so this header carries the contract instead of an import.)
 *
 * These cores skip `requireStudioUser()` ON PURPOSE so DB tests can exercise
 * the guardrails directly. They are deliberately NOT in the "use server"
 * module (lib/studio-actions.ts): Next.js registers every async-function
 * export of a "use server" file as a POST-reachable server action regardless
 * of who imports it (see Next's data-security guide), which would have made
 * these auth-skipping functions client-invokable. Keeping them here means the
 * compiler can never register them as actions; only the guarded actions in
 * lib/studio-actions.ts (and tests) may call them.
 *
 * Status changes go through the Payload Local API, so the Orders afterChange
 * hook still fires — moving to proof_ready or delivered emails the parent
 * exactly as it does from /admin.
 */
import { NotFound } from "payload";

import { getPayloadClient } from "@/lib/payload";
import { ALL_STATUSES, requirementFor } from "@/lib/studio-workflow";
import type { OrderStatus } from "@/lib/order-stages";
import { inStudioStamp } from "@/lib/in-studio-stamp";
import { normalizeDeliveryUrl } from "@/lib/delivery-url";

export type StudioActionResult = { ok: true } | { ok: false; error: string };
export type VideoKind = "proof" | "finalVideo";

/**
 * Core: set an order's status, enforcing the attachment guardrails
 * (proof_ready needs a proof OR a delivery link; delivered needs the final film
 * OR a delivery link).
 */
export async function applyOrderStatusCore(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StudioActionResult> {
  if (!ALL_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "That is not a valid status." };
  }

  const payload = await getPayloadClient();
  let order;
  try {
    order = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
  } catch (err) {
    if (err instanceof NotFound) {
      return { ok: false, error: "We could not find that order." };
    }
    throw err; // real failures propagate — the guarded actions log + return a calm generic error
  }

  const requirement = requirementFor(nextStatus);
  if (requirement === "proof" && !order.proof && !order.proofUrl) {
    return {
      ok: false,
      error: "Add a preview film or a delivery link before sharing the proof with the parent.",
    };
  }
  if (requirement === "finalVideo" && !order.finalVideo && !order.finalVideoUrl) {
    return {
      ok: false,
      error: "Add the final film or a delivery link before marking the order delivered.",
    };
  }

  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      status: nextStatus,
      ...inStudioStamp({
        nextStatus,
        currentInStudioSince: (order.inStudioSince as string | null) ?? null,
        now: new Date(),
      }),
    },
    overrideAccess: true,
  });
  return { ok: true };
}

/** Core: set (ISO string) or clear (null) an order's promised-by date. */
export async function applyPromisedByCore(
  orderId: string,
  promisedByIso: string | null,
): Promise<StudioActionResult> {
  if (promisedByIso !== null) {
    const parsed = new Date(promisedByIso);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "That date did not look right. Please pick it again." };
    }
  }
  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { promisedBy: promisedByIso },
      overrideAccess: true,
    });
  } catch (err) {
    if (err instanceof NotFound) {
      return { ok: false, error: "We could not find that order." };
    }
    throw err; // real failures propagate — the guarded actions log + return a calm generic error
  }
  return { ok: true };
}

/**
 * Core: set (validated https URL) or clear (null) an order's external delivery
 * link for the preview (kind "proof" → proofUrl) or final film (kind
 * "finalVideo" → finalVideoUrl). Auth-skipping ON PURPOSE (DB tests) — the
 * action wraps it with requireStudioUserOrRedirect.
 */
export async function applyDeliveryUrlCore(
  orderId: string,
  kind: VideoKind,
  rawUrl: string | null,
): Promise<StudioActionResult> {
  const field = kind === "proof" ? "proofUrl" : "finalVideoUrl";
  let value: string | null = null;
  // null or whitespace-only → clear the link (not a validation error); a
  // non-empty value must pass https validation before it is stored.
  if (rawUrl !== null && rawUrl.trim() !== "") {
    const normalized = normalizeDeliveryUrl(rawUrl);
    if (!normalized.ok) return { ok: false, error: normalized.error };
    value = normalized.url;
  }
  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { [field]: value },
      overrideAccess: true,
    });
  } catch (err) {
    if (err instanceof NotFound) {
      return { ok: false, error: "We could not find that order." };
    }
    throw err;
  }
  return { ok: true };
}

export interface BlobMeta {
  pathname: string;
  contentType: string;
  size: number;
}

/**
 * Core: register an already-uploaded blob as a media doc (metadata only —
 * the bytes are in Vercel Blob; filename == blob pathname is what the video
 * proxy's head(filename) resolves) and link it to the order's proof/finalVideo.
 * Auth-skipping ON PURPOSE (DB tests) — actions wrap it with requireStudioUser.
 */
export async function attachVideoCore(args: {
  orderId: string;
  kind: VideoKind;
  blob: BlobMeta;
}): Promise<StudioActionResult> {
  const { orderId, kind, blob } = args;
  if (kind !== "proof" && kind !== "finalVideo") {
    return { ok: false, error: "Unknown video slot." };
  }
  if (!blob.contentType.startsWith("video/")) {
    return { ok: false, error: "That file is not a video." };
  }

  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  });
  if (!order) {
    return { ok: false, error: "We could not find that order." };
  }

  const media = await payload.create({
    collection: "media",
    data: {
      filename: blob.pathname,
      mimeType: blob.contentType,
      filesize: blob.size,
    },
    overrideAccess: true,
  });

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { [kind]: media.id },
    overrideAccess: true,
  });
  return { ok: true };
}
