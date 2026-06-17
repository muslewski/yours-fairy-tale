/**
 * blob-upload-options — options for the studio's browser→Vercel Blob client
 * upload (components/studio/video-upload.tsx). Extracted as pure data so the
 * `multipart: true` flag — which makes 200 MB–2 GB films upload as parallel,
 * individually-retried chunks instead of one long PUT that stalls on real
 * networks — is set in ONE tested place. No React, no SDK import.
 */
export interface BlobUploadProgress {
  percentage: number;
}

export interface VideoUploadOptions {
  access: "public";
  handleUploadUrl: string;
  multipart: true;
  onUploadProgress: (event: BlobUploadProgress) => void;
}

export function videoUploadOptions(
  handleUploadUrl: string,
  onUploadProgress: (event: BlobUploadProgress) => void,
): VideoUploadOptions {
  return { access: "public", handleUploadUrl, multipart: true, onUploadProgress };
}
