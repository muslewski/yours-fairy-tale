---
type: zone
summary: "Two-collection Vercel Blob media strategy: `Media` (gated customer uploads, access-controlled) and `SiteMedia` (public direct-URL assets). Both backed by a single Blob store via @payloadcms/storage-vercel-blob. Upload validation and studio browser-to-Blob video uploads in lib/blob-upload-options.ts + lib/order-upload-validation.ts."
tags: [media, vercel-blob, storage, uploads, site-media]
status: seeded
created: 2026-06-23
updated: 2026-06-23
verifiedAt: unverified
owns:
  globs:
    - "collections/Media.ts"
    - "collections/SiteMedia.ts"
    - "lib/blob-upload-options.ts"
    - "lib/order-upload-validation.ts"
depends:
  - "[[payload-backend]]"
  - "[[studio]]"
---

## What this is

Media storage uses two distinct Payload collections sharing one Vercel Blob bucket. `Media` stores customer-supplied photos/uploads with access control (admin-only reads in the Payload API). `SiteMedia` stores marketing/editorial assets with direct public URLs. The studio uploads finished video files directly from the browser to Blob (bypassing the Next.js server) using pre-signed client tokens generated in lib/blob-upload-options.ts.

## Key files

- `collections/Media.ts` — gated customer media collection
- `collections/SiteMedia.ts` — public direct-URL media collection
- `lib/blob-upload-options.ts` — Vercel Blob client upload token generation
- `lib/order-upload-validation.ts` — file type/size validation before upload
