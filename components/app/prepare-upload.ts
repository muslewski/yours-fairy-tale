/**
 * Client-side photo shrinking so each upload request fits under Vercel's
 * ~4.5 MB body cap (see MAX_REQUEST_BYTES). Browser-only: uses canvas.
 *
 * Photos are likeness reference for the studio, not print assets — 2048px
 * JPEG is plenty. Files already small enough pass through untouched. Files
 * the browser cannot decode (some HEICs outside Safari) that are also over
 * the cap get a gentle, actionable error.
 */
import { MAX_REQUEST_BYTES } from "@/lib/order-upload-validation";

const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 0.85;

export type PreparedUpload = { ok: true; file: File } | { ok: false; error: string };

export async function prepareForUpload(file: File): Promise<PreparedUpload> {
  if (file.size <= MAX_REQUEST_BYTES) return { ok: true, file };

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (blob && blob.size <= MAX_REQUEST_BYTES) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return { ok: true, file: new File([blob], name, { type: "image/jpeg" }) };
    }
  } catch {
    // fall through to the gentle error below
  }

  return {
    ok: false,
    error: `"${file.name}" is a little large to send. Please choose a version under 4 MB, or a JPEG copy.`,
  };
}
