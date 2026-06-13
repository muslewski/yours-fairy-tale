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
 * PRODUCTION NOTE: when BLOB_READ_WRITE_TOKEN is set (see isBlobStorageEnabled),
 * media lives in Vercel Blob and the route proxies bytes from Blob behind the
 * same ownership gate; local disk is only the no-token dev fallback. Remaining
 * future work: private Blob storage + short-lived signed playback URLs (or a
 * managed video host like Mux / Cloudflare Stream) — tracked in
 * fairy-tale-mind/tech-debt/local-disk-video-delivery.md.
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

/** True when media is stored in Vercel Blob (token present) instead of local disk. */
export function isBlobStorageEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** The media fields the streaming route needs to serve the file. */
export interface OwnedVideo {
  filename: string;
  mimeType: string;
  filesize: number | null;
  alt: string | null;
}

/** The media fields the gated asset route needs to serve a photo preview. */
export interface OwnedAsset {
  filename: string;
  mimeType: string;
}

/**
 * Resolve a video attached to `orderId` — the delivered `finalVideo` (default)
 * or the `proof` preview — but ONLY after proving the signed-in customer owns
 * the order.
 *
 * - Throws (via `assertOwnsOrder`) if there is no session or the caller is not
 *   the owner — a non-owner learns nothing about the file.
 * - Returns null if the order has no media in that field yet, the media doc is
 *   gone, or it has no filename (so the route can answer 404 and the UI a
 *   gentle "being finalized" fallback rather than crash).
 */
export async function resolveOwnedVideo(
  orderId: string,
  field: "finalVideo" | "proof" = "finalVideo",
): Promise<OwnedVideo | null> {
  const { order, payload } = await assertOwnsOrder(orderId);

  // owner is normalized inside assertOwnsOrder; the relation is an id at depth 0.
  const value = (order as Record<string, unknown>)[field];
  const mediaId =
    typeof value === "object" && value !== null
      ? String((value as { id: string }).id)
      : value
        ? String(value)
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
 * Resolve ONE asset (customer photo) for `orderId`, but only after proving the
 * signed-in customer owns the order AND that `assetId` is one of the order's
 * `assets`. Returns the small `preview` variant when present (falls back to the
 * original), or null if the asset isn't on the order / has no file yet.
 *
 * Mirrors resolveOwnedVideo: ownership is the only door; the blob URL never
 * reaches the client.
 */
export async function resolveOwnedAsset(
  orderId: string,
  assetId: string,
): Promise<OwnedAsset | null> {
  const { order, payload } = await assertOwnsOrder(orderId);

  const rawAssets = (order as { assets?: unknown }).assets;
  const assets = Array.isArray(rawAssets)
    ? rawAssets.map((a) =>
        typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
      )
    : [];
  if (!assets.includes(assetId)) return null;

  try {
    const media = await payload.findByID({
      collection: "media",
      id: assetId,
      depth: 0,
      overrideAccess: true,
    });
    const sizes = (
      media as {
        sizes?: Record<string, { filename?: string | null; mimeType?: string | null }>;
      }
    ).sizes;
    const preview = sizes?.preview;
    const filename = preview?.filename ?? media.filename;
    const mimeType = preview?.mimeType ?? media.mimeType;
    if (!filename || !mimeType) return null;
    return { filename, mimeType };
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
