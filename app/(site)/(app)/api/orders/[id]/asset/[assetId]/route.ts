/**
 * Ownership-gated delivery of one customer photo (the small `preview` variant).
 *
 * GET /api/orders/[id]/asset/[assetId] → streams the preview bytes for that
 * asset, but ONLY if the signed-in customer owns the order AND the asset belongs
 * to it (resolveOwnedAsset runs the same assertOwnsOrder guard as the video
 * route). The `media` collection is read: adminOnly, so this gate — not a
 * guessable static URL — is the only door. Mirrors the video route minus Range
 * (images need no Range).
 */
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import type { ReadStream } from "fs";
import type { NextRequest } from "next/server";

import {
  isBlobStorageEnabled,
  mediaFilePath,
  resolveOwnedAsset,
} from "@/lib/video-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await params;

  let asset;
  try {
    asset = await resolveOwnedAsset(id, assetId);
  } catch {
    return new Response("You do not have access to this photo.", { status: 403 });
  }
  if (!asset) {
    return new Response("This photo is not available.", { status: 404 });
  }

  const headers = {
    "Content-Type": asset.mimeType,
    "Cache-Control": "private, max-age=0, no-store",
  };

  if (isBlobStorageEnabled()) {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blobUrl: string;
    try {
      const blob = await head(asset.filename);
      blobUrl = blob.url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return new Response("This photo is not available.", { status: 404 });
      }
      throw err;
    }
    const upstream = await fetch(blobUrl);
    if (upstream.status !== 200) {
      console.error(
        `[asset] Blob fetch for ${asset.filename} returned ${upstream.status}`,
      );
      return new Response("We could not load this photo right now.", {
        status: 500,
      });
    }
    const out = new Headers(headers);
    const len = upstream.headers.get("content-length");
    if (len) out.set("content-length", len);
    return new Response(upstream.body, { status: 200, headers: out });
  }

  // Local-disk fallback (dev without a Blob token).
  const filePath = mediaFilePath(asset.filename);
  if (!filePath) return new Response("This photo is not available.", { status: 404 });
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("This photo is not available.", { status: 404 });
  }
  const stream = createReadStream(filePath);
  return new Response(toWebStream(stream), {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
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
