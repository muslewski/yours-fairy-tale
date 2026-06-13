import path from "path";
import { fileURLToPath } from "url";

import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Customer media — children's photos, proofs, and delivered videos. The slug
 * stays `media` (Orders.assets/proof/finalVideo point here, and ~8 files
 * reference it); it is only relabeled "Customer media" in the admin UI.
 *
 * Storage: Vercel Blob (pass-through mode — adminOnly read keeps the file URLs
 * gated) where BLOB_READ_WRITE_TOKEN is set; local-disk staticDir is the dev
 * fallback. Customers receive bytes ONLY via the ownership-gated routes
 * (app/(site)/(app)/api/orders/[id]/video and .../asset/[assetId]).
 *
 * Optimization: customer photos are normalized server-side — capped to 2048px
 * and re-encoded to WebP — and get one small `preview` variant for the in-app
 * gallery. Video files pass through untouched (sharp ignores non-images). The
 * accepted mimeTypes are restricted to formats sharp can decode PLUS the studio's
 * video types; HEIC is converted to JPEG client-side before upload
 * (components/app/prepare-upload.ts) so it never reaches sharp here.
 */
export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Customer media", plural: "Customer media" },
  admin: {
    group: "Commerce",
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    staticDir: path.resolve(dirname, "../media"),
    filesRequiredOnCreate: false,
    // Accept sharp-decodable images + the studio's video types. NOTE: the video
    // list MUST stay in sync with app/(site)/studio/api/blob-upload/route.ts and
    // lib/studio-actions; removing a video type here breaks studio attach.
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-matroska",
    ],
    // Bound the stored original: cap longest edge to 2048px, re-encode to WebP.
    // Applies to images only; sharp leaves videos alone.
    resizeOptions: {
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    },
    formatOptions: { format: "webp", options: { quality: 80 } },
    // One small variant for the in-app preview gallery (served through the gate).
    imageSizes: [{ name: "preview", width: 640, withoutEnlargement: true }],
  },
  fields: [
    {
      name: "alt",
      type: "text",
    },
  ],
};
