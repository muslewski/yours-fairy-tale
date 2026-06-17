/**
 * Staff-gated delivery of one customer media file (photo) for the studio
 * workstation. GET /studio/api/media/[id] → streams that media doc's bytes,
 * but ONLY for a signed-in studio admin.
 *
 * Why this exists: customer photos uploaded in the configurator have a
 * `configurator/`-prefixed filename (it contains a "/"). Payload's own
 * /api/media/file/<filename> endpoint is single-segment, so the slash makes it
 * an unmatched path ("Route not found") — the studio's <img src={media.url}>
 * showed broken images (the alt) for every configurator photo. This route is
 * keyed by the media id (a slash-free UUID) and PROXIES the bytes like the
 * customer asset route, so the (public-but-unguessable) Blob URL of a child's
 * photo never reaches the staff browser.
 *
 * Route handlers do NOT inherit the (gated) studio layout, so the admin check
 * happens here via getStudioUser.
 */
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import type { ReadStream } from "fs";

import { getStudioUser } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";
import { isBlobStorageEnabled, mediaFilePath } from "@/lib/video-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getStudioUser();
  if (!user) return new Response("Forbidden", { status: 403 });

  const { id } = await params;
  const payload = await getPayloadClient();
  let media;
  try {
    media = await payload.findByID({
      collection: "media",
      id,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!media?.filename || !media.mimeType) {
    return new Response("Not found", { status: 404 });
  }

  const headers = {
    "Content-Type": String(media.mimeType),
    "Cache-Control": "private, max-age=0, no-store",
  };

  if (isBlobStorageEnabled()) {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blobUrl: string;
    try {
      blobUrl = (await head(String(media.filename))).url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return new Response("Not found", { status: 404 });
      }
      throw err;
    }
    const upstream = await fetch(blobUrl);
    if (upstream.status !== 200) {
      console.error(
        `[studio/media] Blob fetch for ${media.filename} returned ${upstream.status}`,
      );
      return new Response("We could not load this file.", { status: 500 });
    }
    const out = new Headers(headers);
    const len = upstream.headers.get("content-length");
    if (len) out.set("content-length", len);
    return new Response(upstream.body, { status: 200, headers: out });
  }

  // Local-disk fallback (dev without a Blob token).
  const filePath = mediaFilePath(String(media.filename));
  if (!filePath) return new Response("Not found", { status: 404 });
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }
  return new Response(toWebStream(createReadStream(filePath)), {
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
