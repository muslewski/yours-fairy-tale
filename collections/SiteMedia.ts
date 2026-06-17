import path from "path";
import { fileURLToPath } from "url";

import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Public, admin-managed site/brand assets — logos, hero art, marketing pictures,
 * and public sample/marketing VIDEO (e.g. the homepage sample film). Deliberately
 * SEPARATE from the customer `media` collection so customer PII (children's
 * photos, proofs, videos) never shares an access model or a bucket prefix with
 * public site assets.
 *
 * Access: anyone may READ (the files are public on a public Blob store and are
 * served at direct CDN URLs); only staff (`admins`) may create/update/delete.
 * Uploaded ONLY through the Payload /admin UI — there is no public upload form.
 * Large videos are fine: clientUploads (payload.config.ts) streams the browser
 * upload straight to Blob, bypassing Vercel's ~4.5MB request-body cap.
 *
 * Storage: same public Vercel Blob store as `media`, but with
 * `disablePayloadAccessControl: true` + a `site/` prefix (see payload.config.ts),
 * so its URLs are direct, cacheable, and need no proxy. Local-disk staticDir is
 * the no-token dev fallback only.
 */
export const SiteMedia: CollectionConfig = {
  slug: "site-media",
  labels: { singular: "Site media", plural: "Site media" },
  admin: { group: "Site", useAsTitle: "alt" },
  access: {
    read: () => true,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  upload: {
    staticDir: path.resolve(dirname, "../site-media"),
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "video/webm",
    ],
    // Re-encode raster originals to WebP to bound size; sharp passes SVG AND
    // video through untouched (formatOptions/imageSizes apply to images only).
    formatOptions: { format: "webp", options: { quality: 82 } },
    imageSizes: [
      { name: "thumbnail", width: 400 },
      { name: "card", width: 1024 },
      { name: "hero", width: 1920 },
    ],
    focalPoint: true,
  },
  fields: [
    { name: "alt", type: "text", required: true },
    { name: "caption", type: "text" },
  ],
};
