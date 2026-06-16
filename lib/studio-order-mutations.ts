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

export type StudioActionResult = { ok: true } | { ok: false; error: string };

/**
 * Core: set an order's status, enforcing the attachment guardrails
 * (proof_ready needs a proof; delivered needs the final film).
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
  if (requirement === "proof" && !order.proof) {
    return {
      ok: false,
      error: "Add a preview film before sharing the proof with the parent.",
    };
  }
  if (requirement === "finalVideo" && !order.finalVideo) {
    return {
      ok: false,
      error: "Upload the final film before marking the order delivered.",
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

export type VideoKind = "proof" | "finalVideo";

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
