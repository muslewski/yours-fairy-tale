import path from "path";
import { fileURLToPath } from "url";

import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Upload collection for customer-submitted photos and delivered videos.
 *
 * Storage: Vercel Blob in any env where BLOB_READ_WRITE_TOKEN is set (see the
 * vercelBlobStorage plugin in payload.config.ts — pass-through mode, so the
 * adminOnly read rule below still gates the file URLs). Local-disk staticDir
 * is the no-token dev fallback only.
 *
 * Access is staff-only; customers receive bytes ONLY via the ownership-gated
 * route app/(app)/api/orders/[id]/video/route.ts.
 */
export const Media: CollectionConfig = {
  slug: "media",
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
    // The studio panel uploads big videos straight to Vercel Blob from the
    // browser, then registers the blob here as a metadata-only doc (filename
    // == blob pathname). Payload must therefore allow file-less creates.
    filesRequiredOnCreate: false,
  },
  fields: [
    {
      name: "alt",
      type: "text",
    },
  ],
};
