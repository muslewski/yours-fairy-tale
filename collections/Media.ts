import path from "path";
import { fileURLToPath } from "url";

import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Upload collection for customer-submitted photos and generated book assets.
 *
 * Dev: uses Payload's default local-disk storage (`staticDir: "media"`).
 * Prod: wire `@payloadcms/storage-vercel-blob` in a later slice once the
 * BLOB_READ_WRITE_TOKEN env var is available.
 *
 * Access is staff-only; the customer-facing UI will pre-sign uploads
 * server-side in a later slice.
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
  },
  fields: [
    {
      name: "alt",
      type: "text",
    },
  ],
};
