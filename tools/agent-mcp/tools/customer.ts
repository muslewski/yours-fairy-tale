import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

import { appendCustomerNote } from "@/lib/order-actions";
import {
  approveProofCore,
  requestProofChangeCore,
  uploadOrderAssetsCore,
  type UploadFileSpec,
} from "@/lib/order-action-cores";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Read image files from disk and attach them to an order's assets. */
export async function uploadPhotos(orderId: string, filePaths: string[]) {
  const files: UploadFileSpec[] = [];
  for (const path of filePaths) {
    const data = await readFile(path);
    const mimetype = MIME_BY_EXT[extname(path).toLowerCase()] ?? "application/octet-stream";
    files.push({ data, name: basename(path), mimetype, size: data.byteLength });
  }
  return uploadOrderAssetsCore(orderId, files);
}

export async function approveProofTool(orderId: string): Promise<{ ok: true }> {
  await approveProofCore(orderId);
  return { ok: true };
}

export async function requestProofChangeTool(orderId: string, note: string): Promise<{ ok: true }> {
  await requestProofChangeCore(orderId, note);
  return { ok: true };
}

export async function addCustomerNote(orderId: string, message: string) {
  return appendCustomerNote(orderId, message);
}
