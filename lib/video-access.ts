/**
 * Video access — server-only resolution of an order's delivered film.
 *
 * The delivered video is `order.finalVideo`, a doc in the `media` upload
 * collection whose access is `read: adminOnly`. A customer therefore cannot
 * read it through Payload's normal API. The customer dashboard's <video> instead
 * points at an ownership-checked route handler
 * (app/(app)/api/orders/[id]/video/route.ts) that calls `resolveOwnedVideo`
 * below: the SAME `assertOwnsOrder` guard every mutating action uses, then
 * resolution of `finalVideo` to the media fields needed to stream the file.
 * Access is gated by ownership, not by a guessable static URL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION NOTE (MVP shortcut — flagged out-of-scope infra in the spec):
 * This streams a file off LOCAL DISK behind an ownership check. That is fine for
 * dev, but a real deployment must use access-controlled / signed delivery:
 *   - a managed video host (Mux or Cloudflare Stream) with signed playback URLs,
 *   - or private Vercel Blob storage + short-lived signed URLs.
 * The ownership gate (resolveOwnedVideo) stays; only the byte delivery changes.
 * Tracked in fairy-tale-mind/tech-debt/local-disk-video-delivery.md.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import path from "path";

import { assertOwnsOrder } from "@/lib/order-actions";
import { getPayloadClient } from "@/lib/payload";

/**
 * The on-disk root where the `media` upload collection stores files in dev.
 * Mirrors collections/Media.ts `upload.staticDir` (repo-root `/media`); kept in
 * sync here so the streaming route can locate the file by filename.
 */
export const MEDIA_STATIC_DIR = path.resolve(process.cwd(), "media");

/** The media fields the streaming route needs to serve the file. */
export interface OwnedVideo {
  filename: string;
  mimeType: string;
  filesize: number | null;
  alt: string | null;
}

/**
 * Resolve the delivered video for `orderId`, but ONLY after proving the
 * signed-in customer owns the order.
 *
 * - Throws (via `assertOwnsOrder`) if there is no session or the caller is not
 *   the owner — a non-owner learns nothing about the file.
 * - Returns null if the order has no `finalVideo` yet, the media doc is gone, or
 *   it has no filename (so the route can answer 404 and the UI a gentle
 *   "being finalized" fallback rather than crash).
 */
export async function resolveOwnedVideo(
  orderId: string,
): Promise<OwnedVideo | null> {
  const { order, payload } = await assertOwnsOrder(orderId);

  // owner is normalized inside assertOwnsOrder; finalVideo is an id at depth 0.
  const finalVideo = (order as { finalVideo?: unknown }).finalVideo;
  const mediaId =
    typeof finalVideo === "object" && finalVideo !== null
      ? String((finalVideo as { id: string }).id)
      : finalVideo
        ? String(finalVideo)
        : null;

  if (!mediaId) return null;

  try {
    const media = await payload.findByID({
      collection: "media",
      id: mediaId,
      depth: 0,
      overrideAccess: true,
    });
    if (!media.filename || !media.mimeType) return null;
    return {
      filename: media.filename,
      mimeType: media.mimeType,
      filesize: media.filesize ?? null,
      alt: media.alt ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Absolute path to a media file on local disk. Guards against path traversal:
 * the resolved path MUST stay inside MEDIA_STATIC_DIR, so a crafted filename
 * (e.g. "../../.env") can never escape the upload root. Returns null if it would.
 */
export function mediaFilePath(filename: string): string | null {
  const resolved = path.resolve(MEDIA_STATIC_DIR, filename);
  const root = MEDIA_STATIC_DIR + path.sep;
  if (resolved !== MEDIA_STATIC_DIR && !resolved.startsWith(root)) {
    return null;
  }
  return resolved;
}
