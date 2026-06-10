/**
 * Ownership-gated delivery of an order's finished film (Task 4.4).
 *
 * GET /api/orders/[id]/video         → streams the delivered video inline
 * GET /api/orders/[id]/video?download → same bytes, as an attachment download
 *
 * Why a route handler instead of a direct media URL: the `media` collection is
 * `read: adminOnly`, so Payload's own /api/media/file/<name> endpoint refuses a
 * customer. Here we run `resolveOwnedVideo` — the SAME `assertOwnsOrder` guard as
 * every mutating action — so a customer can only ever fetch a film attached to an
 * order they own. Access is gated by ownership, never by a guessable static URL.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCTION NOTE: when BLOB_READ_WRITE_TOKEN is set, media lives in Vercel Blob
 * and Blob-backed delivery proxies through this same ownership gate (the Blob
 * URL never reaches the client); local disk is the dev fallback only. Future:
 * private Blob storage + short-lived signed playback URLs. See
 * lib/video-access.ts and the tech-debt note.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import type { ReadStream } from "fs";
import type { NextRequest } from "next/server";

import {
  isBlobStorageEnabled,
  mediaFilePath,
  resolveOwnedVideo,
} from "@/lib/video-access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Ownership gate. Throws for a missing session or a non-owner → 403.
  let video;
  try {
    video = await resolveOwnedVideo(id);
  } catch {
    return new Response("You do not have access to this video.", {
      status: 403,
    });
  }

  // Delivered order with no film yet (or media missing) → 404; the UI shows a
  // gentle "being finalized" fallback rather than crashing.
  if (!video) {
    return new Response("This video is not ready yet.", { status: 404 });
  }

  const download = request.nextUrl.searchParams.has("download");
  const disposition = download
    ? `attachment; filename="${encodeURIComponent(video.filename)}"`
    : "inline";

  if (isBlobStorageEnabled()) {
    // Blob mode: resolve the stored file by pathname (== filename: no prefix,
    // no random suffix configured) and proxy the bytes. The Blob URL never
    // reaches the client — ownership stays the only door. Range is forwarded
    // so <video> seeking works.
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blobUrl: string;
    try {
      const blob = await head(video.filename);
      blobUrl = blob.url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return new Response("This video is not ready yet.", { status: 404 });
      }
      throw err;
    }

    const range = request.headers.get("range");
    const upstream = await fetch(blobUrl, {
      headers: range ? { range } : undefined,
    });
    if (upstream.status !== 200 && upstream.status !== 206) {
      return new Response("This video is not ready yet.", { status: 404 });
    }

    const headers = new Headers({
      "Content-Type": video.mimeType,
      "Content-Disposition": disposition,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=0, no-store",
    });
    for (const h of ["content-length", "content-range"] as const) {
      const value = upstream.headers.get(h);
      if (value) headers.set(h, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  // Local-disk fallback (dev without a Blob token).
  const filePath = mediaFilePath(video.filename);
  if (!filePath) {
    return new Response("This video is not ready yet.", { status: 404 });
  }

  let size: number;
  try {
    const stats = await stat(filePath);
    size = stats.size;
  } catch {
    return new Response("This video is not ready yet.", { status: 404 });
  }

  const baseHeaders: Record<string, string> = {
    "Content-Type": video.mimeType,
    "Content-Disposition": disposition,
    "Accept-Ranges": "bytes",
    // Private: belongs to one customer, never share-cacheable.
    "Cache-Control": "private, max-age=0, no-store",
  };

  // Honor a Range request so <video> scrubbing/seeking works.
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const startStr = match[1];
      const endStr = match[2];
      let start = startStr ? parseInt(startStr, 10) : 0;
      let end = endStr ? parseInt(endStr, 10) : size - 1;

      // Suffix range: "bytes=-500" → last 500 bytes.
      if (!startStr && endStr) {
        start = Math.max(0, size - parseInt(endStr, 10));
        end = size - 1;
      }

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end ||
        start >= size
      ) {
        return new Response("Requested range not satisfiable.", {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      end = Math.min(end, size - 1);

      const stream = createReadStream(filePath, { start, end });
      return new Response(toWebStream(stream), {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${size}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
  }

  const stream = createReadStream(filePath);
  return new Response(toWebStream(stream), {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}

/** Adapt a Node fs ReadStream to a Web ReadableStream for the Response body. */
function toWebStream(nodeStream: ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(
          typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
        );
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}
