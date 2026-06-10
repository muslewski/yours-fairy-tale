/**
 * POST /studio/api/blob-upload — mints short-lived client-upload tokens so the
 * studio's browser can stream big video files STRAIGHT to Vercel Blob (the
 * server never sees the bytes; Vercel caps request bodies at ~4.5MB).
 *
 * SECURITY: route handlers do NOT inherit the (gated) layout — the admin check
 * happens inside onBeforeGenerateToken, before any token is signed.
 *
 * NOTE: no onUploadCompleted — it does not fire on localhost. The client calls
 * the attachUploadedVideo action itself after the upload finishes.
 */
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getStudioUser } from "@/lib/studio-auth";

const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

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
      onBeforeGenerateToken: async () => {
        const user = await getStudioUser();
        if (!user) {
          throw new Error("You need to be signed in to the studio to upload.");
        }
        return {
          allowedContentTypes: [
            "video/mp4",
            "video/quicktime",
            "video/webm",
            "video/x-matroska",
          ],
          maximumSizeInBytes: MAX_VIDEO_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Upload could not start.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
