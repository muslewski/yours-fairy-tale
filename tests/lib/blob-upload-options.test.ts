/**
 * blob-upload-options — the studio video upload's Blob client options, with the
 * multipart flag pinned by a test so a 200 MB–2 GB film can't silently regress
 * to a single fragile PUT.
 */
import { describe, expect, test, vi } from "vitest";

import { videoUploadOptions } from "@/lib/blob-upload-options";

describe("videoUploadOptions", () => {
  test("enables multipart so large films upload as resilient chunks", () => {
    expect(videoUploadOptions("/studio/api/blob-upload", () => {}).multipart).toBe(true);
  });

  test("uploads with public access via the given handle url and wires progress", () => {
    const onProgress = vi.fn();
    const opts = videoUploadOptions("/studio/api/blob-upload", onProgress);
    expect(opts.access).toBe("public");
    expect(opts.handleUploadUrl).toBe("/studio/api/blob-upload");
    opts.onUploadProgress({ percentage: 42 });
    expect(onProgress).toHaveBeenCalledWith({ percentage: 42 });
  });
});
