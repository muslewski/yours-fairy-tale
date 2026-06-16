/**
 * POST /api/configurator/blob-upload — mints short-lived client-upload tokens so
 * a PUBLIC (pre-account) configurator browser can stream photos STRAIGHT to
 * Vercel Blob, bypassing Vercel's ~4.5MB request cap. There is no order or
 * account yet; association happens later via pathnames in the Stripe checkout
 * metadata (the webhook attaches them).
 *
 * Anonymous by design. Abuse is bounded by: image-only content types, a 15MB
 * size cap, a forced `configurator/` pathname prefix, addRandomSuffix (no
 * overwrite/guess), and the daily prune cron that deletes unreferenced
 * configurator/* blobs (see app/api/cron/prune-blobs + orphaned-blobs debt).
 */
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15MB, matches MAX_UPLOAD_BYTES

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("configurator/")) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_PHOTO_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload could not start.";
    const known =
      message === "Invalid upload path." ||
      message.toLowerCase().includes("content type") ||
      message.toLowerCase().includes("size");
    if (!known) console.error("[configurator] blob-upload token route failed:", err);
    return NextResponse.json(
      { error: known ? message : "Upload could not start." },
      { status: 400 },
    );
  }
}
