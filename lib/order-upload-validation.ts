/**
 * Upload validation — pure, DOM-free, framework-free.
 *
 * Lives apart from lib/order-actions.ts because that file is "use server"
 * (Next.js Server Actions), where every export must be an async function. These
 * synchronous helpers and constants are shared by the server action AND the
 * client upload component (so the parent gets instant feedback before sending),
 * and unit-tested directly.
 */

/** Max bytes per uploaded photo. Generous for phone photos, sane as a cap. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

/** The minimal shape we validate before uploading — a real File satisfies it. */
export interface UploadCandidate {
  type: string;
  size: number;
  name: string;
}

export type UploadValidation = { ok: true } | { ok: false; error: string };

/**
 * Validate a single file is a reasonably sized image. Messages are
 * parent-facing (brand-voice): plain, warm, no alarm.
 */
export function validateUploadFile(file: UploadCandidate): UploadValidation {
  if (!file.type || !file.type.startsWith("image/")) {
    return {
      ok: false,
      error: `"${file.name}" is not an image. Please add photos only (JPEG, PNG, or HEIC).`,
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" is a little large. Please keep each photo under 15 MB.`,
    };
  }
  return { ok: true };
}
