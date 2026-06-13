# Two Media Collections + Blob Optimization + Gated Photo Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public admin-managed `site-media` collection alongside the existing gated customer `media` collection on one public Vercel Blob store; bound customer-photo storage with server-side image optimization; and let a parent preview the photos they uploaded through a new ownership-gated image route.

**Architecture:** Two Payload upload collections share one public Blob store via per-collection plugin options — `site-media` gets `disablePayloadAccessControl` (direct CDN URLs) + a `site/` prefix, while `media` keeps access control and is served only through ownership-gated routes. Customer photos are normalized to bounded WebP + a small preview on upload (Payload `resizeOptions`/`formatOptions`/`imageSizes`). A new gated route mirrors the existing video route to stream a photo's preview to its owner.

**Tech Stack:** Payload v3.85 (upload collections, `sharp` image processing, Local API, Postgres/Neon uuid PKs), `@payloadcms/storage-vercel-blob` (public-only; per-collection options), `@vercel/blob` 2.4.0 (`head`), Next.js 16 App Router, vitest (DB-backed) + Playwright Layer B.

**Spec:** `fairy-tale-mind/specs/2026-06-13-media-collections-blob-optimization-design.md`.

**Verified against installed source (do not re-derive):**
- Payload upload supports `formatOptions: { format: "webp", options: { quality } }`, `resizeOptions` (sharp `ResizeOptions`), `imageSizes: [{ name, width?, height?, ...ResizeOptions }]`, `focalPoint`, `mimeTypes` (node_modules/payload/dist/uploads/types.d.ts:45-72, 93, 247, 276).
- The blob plugin takes per-collection options incl. `disablePayloadAccessControl?: true` and `prefix?: string` (node_modules/@payloadcms/plugin-cloud-storage/dist/types.d.ts:85-87); the Vercel plugin is **public-only** (`access?: 'public'`, index.d.ts:3-10).
- `@vercel/blob` exports `head` + `BlobNotFoundError` (already used by the video route).
- `payload-types.ts` is **not generated/tracked** in this repo — media docs from `findByID` are accessed with defensive casts (see `lib/video-access.ts`), not typed imports. Follow that pattern.

**House conventions:** brand tokens only (no hex), `shadow-comic*`, Fredoka via `style={{ fontFamily: "var(--font-fredoka)" }}`, `next/link` for internal links, gated dynamic media uses plain `<img>` (Next/Image can't fetch gated URLs). Customer-facing copy: sentence case, calm, no em-dashes. DB-backed vitest needs `.env.test`; this sandbox may have no DB — run the non-DB subset, note DB tests CI-deferred (as prior plans did). Commit after each task; never push (the orchestrator handles integration).

**Deferred from the spec (deliberate, low-risk):** per-order `prefix` hardening of *customer* blobs is dropped from this plan — it needs a per-document `prefix` schema column whose current production state can't be confirmed without a DB, and the ownership-gated proxy already protects the bytes (the blob URL never reaches the client). Site-media still gets the cheap collection-level `prefix: "site"`. Revisit prefix hardening only if true-private work happens.

---

### Task 1: `site-media` collection + blob plugin per-collection options

**Files:**
- Create: `collections/SiteMedia.ts`
- Modify: `payload.config.ts` (import + `collections` array + `vercelBlobStorage` options)

- [ ] **Step 1: Create `collections/SiteMedia.ts`**

```ts
import path from "path";
import { fileURLToPath } from "url";

import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

/**
 * Public, admin-managed site/brand imagery — logos, hero art, marketing
 * pictures. Deliberately SEPARATE from the customer `media` collection so
 * customer PII (children's photos, proofs, videos) never shares an access model
 * or a bucket prefix with public site assets.
 *
 * Access: anyone may READ (the files are public on a public Blob store and are
 * served at direct CDN URLs); only staff (`admins`) may create/update/delete.
 * Uploaded ONLY through the Payload /admin UI — there is no public upload form.
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
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
    // Re-encode raster originals to WebP to bound size; sharp passes SVG through.
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
```

- [ ] **Step 2: Register in `payload.config.ts`**

Add the import beside the other collection imports:

```ts
import { SiteMedia } from "./collections/SiteMedia";
```

Add `SiteMedia` to the `collections` array, right after `Media`:

```ts
    Orders,
    Waitlist,
    Media,
    SiteMedia,
```

Replace the `vercelBlobStorage({...})` block's `collections` map (keep `enabled`, `token`, `clientUploads` exactly as they are) with:

```ts
      collections: {
        media: true,
        "site-media": {
          // Public marketing assets: serve direct CDN URLs (no Payload proxy)
          // and namespace them under `site/` in the shared store.
          disablePayloadAccessControl: true,
          prefix: "site",
        },
      },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add collections/SiteMedia.ts payload.config.ts
git commit -m "feat(media): public admin-managed site-media collection on the shared blob store"
```

---

### Task 2: Customer `media` optimization + format allow-list + relabel

**Files:**
- Modify: `collections/Media.ts`

- [ ] **Step 1: Rewrite `collections/Media.ts`**

Keep the imports and `dirname` setup; replace the exported collection with:

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (`fit: "inside"` and the sharp option shapes are valid per the verified types.)

- [ ] **Step 3: Commit**

```bash
git add collections/Media.ts
git commit -m "feat(media): bound customer photos to WebP + a preview size; restrict to sharp-safe + studio formats"
```

---

### Task 3: Migration — `site-media` tables + `media` preview-size columns

**Files:**
- Create: `migrations/20260613_000000_media_site_media.ts`
- Modify: `migrations/index.ts`

**Why this task needs a DB:** Payload's upload tables have many generated columns (per-size `*_url/_width/_height/_filename/_mime_type/_filesize`, focal point, etc.). The authoritative SQL MUST come from Payload's generator — do NOT hand-fabricate the column list. The repo convention (every migration file) is: generate, then make idempotent, then verify.

- [ ] **Step 1: Generate the real diff against a dev DB**

Run (with `.env`/`.env.test` pointing at a dev database):

```bash
npm run migrate:create -- media_site_media
```

Expected: a new file in `migrations/` whose `up` contains `CREATE TABLE "site_media" (...)` (and possibly a `site_media_sizes` companion or inline `sizes_*` columns), plus `ALTER TABLE "media" ADD COLUMN ... "sizes_preview_*"` for the new preview size. Read it — it is the ground truth for Step 2.

- [ ] **Step 2: Author the idempotent migration**

Create `migrations/20260613_000000_media_site_media.ts`, transcribing the generated SQL but making every statement idempotent (`IF NOT EXISTS` on tables/columns/indexes), matching the house style of `migrations/20260610_000000_waitlist.ts`. Skeleton to fill from the generated SQL:

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Two-media-collections groundwork:
 *   - NEW "site_media" upload table (+ size columns for thumbnail/card/hero,
 *     focal point, alt, caption) for the public admin-managed site-media collection.
 *   - NEW "media" preview-size columns (sizes_preview_*) for the customer
 *     in-app photo preview.
 *
 * Column lists below are transcribed from `npm run migrate:create` output and
 * made idempotent. Additive only. VERIFY against a fresh migrate:create before
 * merging — Payload's drizzle naming wins if anything differs.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "site_media" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "alt" varchar NOT NULL,
      "caption" varchar,
      "prefix" varchar DEFAULT 'site',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "url" varchar,
      "thumbnail_u_r_l" varchar,
      "filename" varchar,
      "mime_type" varchar,
      "filesize" numeric,
      "width" numeric,
      "height" numeric,
      "focal_x" numeric,
      "focal_y" numeric,
      "sizes_thumbnail_url" varchar,
      "sizes_thumbnail_width" numeric,
      "sizes_thumbnail_height" numeric,
      "sizes_thumbnail_mime_type" varchar,
      "sizes_thumbnail_filesize" numeric,
      "sizes_thumbnail_filename" varchar,
      "sizes_card_url" varchar,
      "sizes_card_width" numeric,
      "sizes_card_height" numeric,
      "sizes_card_mime_type" varchar,
      "sizes_card_filesize" numeric,
      "sizes_card_filename" varchar,
      "sizes_hero_url" varchar,
      "sizes_hero_width" numeric,
      "sizes_hero_height" numeric,
      "sizes_hero_mime_type" varchar,
      "sizes_hero_filesize" numeric,
      "sizes_hero_filename" varchar
    );
    CREATE INDEX IF NOT EXISTS "site_media_updated_at_idx" ON "site_media" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "site_media_created_at_idx" ON "site_media" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "site_media_filename_idx" ON "site_media" USING btree ("filename");
    CREATE INDEX IF NOT EXISTS "site_media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "site_media" USING btree ("sizes_thumbnail_filename");
    CREATE INDEX IF NOT EXISTS "site_media_sizes_card_sizes_card_filename_idx" ON "site_media" USING btree ("sizes_card_filename");
    CREATE INDEX IF NOT EXISTS "site_media_sizes_hero_sizes_hero_filename_idx" ON "site_media" USING btree ("sizes_hero_filename");

    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_url" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_width" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_height" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_mime_type" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_filesize" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_filename" varchar;
    CREATE INDEX IF NOT EXISTS "media_sizes_preview_sizes_preview_filename_idx" ON "media" USING btree ("sizes_preview_filename");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_media";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_filename";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_filesize";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_mime_type";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_height";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_width";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_url";
  `);
}
```

**Reconcile against Step 1's output:** if the generator names columns differently (e.g. `thumbnail_u_r_l` vs `thumbnail_url`, or emits a separate `site_media_sizes` table), use the GENERATOR's names/shape, not this skeleton. If the generator also shows a `prefix` column being added to `media` (because the plugin's prefix field newly materializes), include that `ADD COLUMN IF NOT EXISTS "prefix"` too. Drop the `prefix` column from `site_media` here only if the generator doesn't produce it.

- [ ] **Step 3: Register in `migrations/index.ts`**

Add the import (chronological, last):

```ts
import * as migration_20260613_000000_media_site_media from "./20260613_000000_media_site_media";
```

and append to the `migrations` array:

```ts
  {
    up: migration_20260613_000000_media_site_media.up,
    down: migration_20260613_000000_media_site_media.down,
    name: "20260613_000000_media_site_media",
  },
```

- [ ] **Step 4: Verify it applies**

With a dev DB: `npm run migrate` (or let dev push reconcile), then `npm run migrate:status`.
Expected: the migration is listed/applied with no error. If no DB locally, typecheck only (`npx tsc --noEmit`) and defer the apply to CI/preview — note it.

- [ ] **Step 5: Commit**

```bash
git add migrations/20260613_000000_media_site_media.ts migrations/index.ts
git commit -m "feat(db): site_media tables + media preview-size columns"
```

---

### Task 4: Client always-converts HEIC + server format guard

**Files:**
- Modify: `components/app/prepare-upload.ts`
- Modify: `lib/order-actions.ts` (`uploadOrderAssets` — add a format guard before create)
- Modify: `lib/order-upload-validation.ts` (export the accepted-image predicate)
- Test: `tests/app/order-upload-validation.test.ts` (extend, or create)

- [ ] **Step 1: Add a shared "server-accepted image" predicate (failing test)**

Create/extend `tests/app/order-upload-validation.test.ts`:

```ts
import { describe, expect, test } from "vitest";

import {
  isServerAcceptedImage,
  validateUploadFile,
} from "@/lib/order-upload-validation";

describe("isServerAcceptedImage", () => {
  test("accepts jpeg/png/webp; rejects heic and non-images", () => {
    expect(isServerAcceptedImage("image/jpeg")).toBe(true);
    expect(isServerAcceptedImage("image/png")).toBe(true);
    expect(isServerAcceptedImage("image/webp")).toBe(true);
    expect(isServerAcceptedImage("image/heic")).toBe(false);
    expect(isServerAcceptedImage("image/heif")).toBe(false);
    expect(isServerAcceptedImage("application/pdf")).toBe(false);
    expect(isServerAcceptedImage("")).toBe(false);
  });
});

describe("validateUploadFile (unchanged client-side gate still accepts HEIC)", () => {
  test("HEIC passes the client picker validation (converted later)", () => {
    expect(validateUploadFile({ type: "image/heic", size: 1000, name: "a.heic" }).ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/app/order-upload-validation.test.ts`
Expected: FAIL — `isServerAcceptedImage` is not exported.

- [ ] **Step 3: Add the predicate to `lib/order-upload-validation.ts`**

Append:

```ts
/**
 * The image content types the SERVER (Payload + sharp) accepts for customer
 * media — MUST mirror collections/Media.ts `upload.mimeTypes` (image subset).
 * HEIC is intentionally excluded: it is converted to JPEG client-side before
 * upload (components/app/prepare-upload.ts), so a HEIC reaching the server is an
 * error worth a gentle message rather than a raw Payload mimeTypes rejection.
 */
const SERVER_ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function isServerAcceptedImage(mimeType: string): boolean {
  return SERVER_ACCEPTED_IMAGE_TYPES.has(mimeType);
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/app/order-upload-validation.test.ts`
Expected: PASS.

- [ ] **Step 5: Always convert HEIC client-side in `components/app/prepare-upload.ts`**

Replace the early `if (file.size <= MAX_REQUEST_BYTES) return { ok: true, file };` guard so HEIC is ALWAYS re-encoded (even when small), while non-HEIC under the cap still passes through:

```ts
export async function prepareForUpload(file: File): Promise<PreparedUpload> {
  const isHeic =
    /image\/(heic|heif)/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

  // Non-HEIC already under the request cap needs no work. HEIC always gets
  // re-encoded to JPEG: the server only accepts jpeg/png/webp, and sharp may
  // not decode HEIF.
  if (!isHeic && file.size <= MAX_REQUEST_BYTES) return { ok: true, file };

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
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
```

- [ ] **Step 6: Guard the server action in `lib/order-actions.ts`**

In `uploadOrderAssets`, after the existing `validateUploadFile` batch loop and before the create loop, add a format guard. Combine the import with the existing import from that module (it already imports `validateUploadFile` from `@/lib/order-upload-validation`):

```ts
  for (const file of files) {
    if (!isServerAcceptedImage(file.type)) {
      return {
        added: 0,
        error: `"${file.name}" is in a format we can't process. Please use a JPEG or PNG.`,
      };
    }
  }
```

- [ ] **Step 7: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run tests/app/order-upload-validation.test.ts`
Expected: clean / PASS. (`prepare-upload.ts` is browser-only — no unit test; behavior verified on a preview deploy.)

```bash
git add components/app/prepare-upload.ts lib/order-actions.ts lib/order-upload-validation.ts tests/app/order-upload-validation.test.ts
git commit -m "feat(upload): always convert HEIC client-side; reject unprocessable formats with a gentle error"
```

---

### Task 5: `resolveOwnedAsset` — ownership-gated photo resolver (TDD)

**Files:**
- Modify: `lib/video-access.ts` (add `OwnedAsset` + `resolveOwnedAsset`)
- Test: `tests/app/video-access.test.ts` (extend — mirror the existing proof/finalVideo tests' seeding + session mock)

- [ ] **Step 1: Write the failing test**

Append to `tests/app/video-access.test.ts`, mirroring the file's existing helpers (real owner + media seed, `mockGetCustomerSession`/`sessionFor`, plus whatever created-doc cleanup arrays the file already uses):

```ts
test("resolveOwnedAsset returns the preview for an asset on the owner's order", async () => {
  const payload = await getPayloadClient();
  const owner = await payload.create({
    collection: "users",
    data: { email: `asset-${Date.now()}@example.com`, emailVerified: true },
    overrideAccess: true,
  });
  const photo = await payload.create({
    collection: "media",
    data: { alt: "a photo" },
    file: { data: Buffer.from("not-a-real-image"), name: `a-${Date.now()}.jpg`, mimetype: "image/jpeg", size: 16 },
    overrideAccess: true,
  });
  const order = await payload.create({
    collection: "orders",
    data: { owner: owner.id, status: "in_production", assets: [photo.id] },
    overrideAccess: true,
  });

  mockGetCustomerSession.mockResolvedValue(sessionFor(String(owner.id)));

  const resolved = await resolveOwnedAsset(String(order.id), String(photo.id));
  expect(resolved).not.toBeNull();
  expect(resolved?.mimeType).toBeTruthy();
  expect(resolved?.filename).toBeTruthy();

  // An assetId NOT on the order resolves to null even for the owner.
  expect(await resolveOwnedAsset(String(order.id), "00000000-0000-0000-0000-000000000000")).toBeNull();
});

test("resolveOwnedAsset throws for a non-owner", async () => {
  const payload = await getPayloadClient();
  const stranger = await payload.create({
    collection: "users",
    data: { email: `stranger-${Date.now()}@example.com`, emailVerified: true },
    overrideAccess: true,
  });
  const owner = await payload.create({
    collection: "users",
    data: { email: `owner2-${Date.now()}@example.com`, emailVerified: true },
    overrideAccess: true,
  });
  const photo = await payload.create({
    collection: "media",
    data: { alt: "p" },
    file: { data: Buffer.from("x"), name: `p-${Date.now()}.jpg`, mimetype: "image/jpeg", size: 1 },
    overrideAccess: true,
  });
  const order = await payload.create({
    collection: "orders",
    data: { owner: owner.id, status: "in_production", assets: [photo.id] },
    overrideAccess: true,
  });

  mockGetCustomerSession.mockResolvedValue(sessionFor(String(stranger.id)));
  await expect(resolveOwnedAsset(String(order.id), String(photo.id))).rejects.toThrow();
});
```

(Register any new docs in the file's existing cleanup arrays so the shared test DB stays clean.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/app/video-access.test.ts`
Expected: FAIL — `resolveOwnedAsset` is not exported (or TS arity error). In a DB-less sandbox you may instead see the Postgres connection error; rely on `npx tsc --noEmit` to prove the missing export.

- [ ] **Step 3: Implement in `lib/video-access.ts`**

Add the interface near `OwnedVideo`:

```ts
/** The media fields the gated asset route needs to serve a photo preview. */
export interface OwnedAsset {
  filename: string;
  mimeType: string;
}
```

Add the resolver (uses the same `assertOwnsOrder` doorway; confirms the asset belongs to the order; prefers the small `preview` variant):

```ts
/**
 * Resolve ONE asset (customer photo) for `orderId`, but only after proving the
 * signed-in customer owns the order AND that `assetId` is one of the order's
 * `assets`. Returns the small `preview` variant when present (falls back to the
 * original), or null if the asset isn't on the order / has no file yet.
 *
 * Mirrors resolveOwnedVideo: ownership is the only door; the blob URL never
 * reaches the client.
 */
export async function resolveOwnedAsset(
  orderId: string,
  assetId: string,
): Promise<OwnedAsset | null> {
  const { order, payload } = await assertOwnsOrder(orderId);

  const assets = Array.isArray((order as { assets?: unknown }).assets)
    ? ((order as { assets: unknown[] }).assets).map((a) =>
        typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
      )
    : [];
  if (!assets.includes(assetId)) return null;

  try {
    const media = await payload.findByID({
      collection: "media",
      id: assetId,
      depth: 0,
      overrideAccess: true,
    });
    const sizes = (media as { sizes?: Record<string, { filename?: string | null; mimeType?: string | null }> }).sizes;
    const preview = sizes?.preview;
    const filename = preview?.filename ?? media.filename;
    const mimeType = preview?.mimeType ?? media.mimeType;
    if (!filename || !mimeType) return null;
    return { filename, mimeType };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/app/video-access.test.ts` (DB) and `npx tsc --noEmit`.
Expected: PASS / clean. DB-less sandbox: tsc clean + failures are Postgres-only.

- [ ] **Step 5: Commit**

```bash
git add lib/video-access.ts tests/app/video-access.test.ts
git commit -m "feat(media): resolveOwnedAsset — ownership-gated photo preview resolution"
```

---

### Task 6: Gated asset route

**Files:**
- Create: `app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts`

- [ ] **Step 1: Implement the route**

```ts
/**
 * Ownership-gated delivery of one customer photo (the small `preview` variant).
 *
 * GET /api/orders/[id]/asset/[assetId] → streams the preview bytes for that
 * asset, but ONLY if the signed-in customer owns the order AND the asset belongs
 * to it (resolveOwnedAsset runs the same assertOwnsOrder guard as the video
 * route). The `media` collection is read: adminOnly, so this gate — not a
 * guessable static URL — is the only door. Mirrors the video route minus Range
 * (images need no Range).
 */
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import type { ReadStream } from "fs";
import type { NextRequest } from "next/server";

import {
  isBlobStorageEnabled,
  mediaFilePath,
  resolveOwnedAsset,
} from "@/lib/video-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  const { id, assetId } = await params;

  let asset;
  try {
    asset = await resolveOwnedAsset(id, assetId);
  } catch {
    return new Response("You do not have access to this photo.", { status: 403 });
  }
  if (!asset) {
    return new Response("This photo is not available.", { status: 404 });
  }

  const headers = {
    "Content-Type": asset.mimeType,
    "Cache-Control": "private, max-age=0, no-store",
  };

  if (isBlobStorageEnabled()) {
    const { head, BlobNotFoundError } = await import("@vercel/blob");
    let blobUrl: string;
    try {
      const blob = await head(asset.filename);
      blobUrl = blob.url;
    } catch (err) {
      if (err instanceof BlobNotFoundError) {
        return new Response("This photo is not available.", { status: 404 });
      }
      throw err;
    }
    const upstream = await fetch(blobUrl);
    if (upstream.status !== 200) {
      console.error(`[asset] Blob fetch for ${asset.filename} returned ${upstream.status}`);
      return new Response("We could not load this photo right now.", { status: 500 });
    }
    const out = new Headers(headers);
    const len = upstream.headers.get("content-length");
    if (len) out.set("content-length", len);
    return new Response(upstream.body, { status: 200, headers: out });
  }

  // Local-disk fallback (dev without a Blob token).
  const filePath = mediaFilePath(asset.filename);
  if (!filePath) return new Response("This photo is not available.", { status: 404 });
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("This photo is not available.", { status: 404 });
  }
  const stream = createReadStream(filePath);
  return new Response(toWebStream(stream), {
    status: 200,
    headers: { ...headers, "Content-Length": String(size) },
  });
}

/** Adapt a Node fs ReadStream to a Web ReadableStream for the Response body. */
function toWebStream(nodeStream: ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk) => {
        controller.enqueue(
          typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk,
        );
      });
      nodeStream.on("end", () => controller.close());
      nodeStream.on("error", (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit`
Expected: clean.

```bash
git add "app/(site)/(app)/api/orders/[id]/asset/[assetId]/route.ts"
git commit -m "feat(media): ownership-gated route serving a customer photo preview"
```

---

### Task 7: In-app preview gallery

**Files:**
- Create: `components/app/uploaded-photos.tsx`
- Modify: `app/(site)/(app)/app/orders/[id]/page.tsx` (mount it)

- [ ] **Step 1: Create `components/app/uploaded-photos.tsx`**

```tsx
/**
 * UploadedPhotos — a thumbnail grid of the photos the parent uploaded for this
 * order. Each thumbnail loads the small `preview` variant through the
 * ownership-gated route (plain <img>: gated URLs aren't Next/Image-optimizable).
 * Server component; no client state. Renders nothing when there are no assets.
 */
interface UploadedPhotosProps {
  orderId: string;
  assetIds: string[];
}

export function UploadedPhotos({ orderId, assetIds }: UploadedPhotosProps) {
  if (assetIds.length === 0) return null;

  return (
    <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        Photos you sent
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {assetIds.map((assetId) => (
          <li key={assetId}>
            {/* eslint-disable-next-line @next/next/no-img-element -- gated dynamic media URL */}
            <img
              src={`/api/orders/${orderId}/asset/${assetId}`}
              alt="A photo you sent for this order"
              loading="lazy"
              className="aspect-square w-full rounded-2xl border-2 border-brand-deep object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Mount it on the order page**

In `app/(site)/(app)/app/orders/[id]/page.tsx`:

Add the import:

```tsx
import { UploadedPhotos } from "@/components/app/uploaded-photos";
```

Compute the asset ids near the other derived values (after `const notes = ...`):

```tsx
  const assetIds = (Array.isArray(order.assets) ? order.assets : []).map((a) =>
    typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
  );
```

Render the gallery between `<StoryPanel ... />` and `<OrderNotes ... />`:

```tsx
      <StoryPanel order={order} />

      <UploadedPhotos orderId={String(order.id)} assetIds={assetIds} />

      <OrderNotes orderId={String(order.id)} notes={notes} />
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit && npx vitest run tests/app/order-stages.test.ts`
Expected: clean / PASS.

```bash
git add components/app/uploaded-photos.tsx "app/(site)/(app)/app/orders/[id]/page.tsx"
git commit -m "feat(app): in-app gallery so a parent can preview the photos they uploaded"
```

---

### Task 8: Playwright Layer B — upload then preview

**Files:**
- Create: `e2e/photo-preview.spec.ts`

- [ ] **Step 1: Add the spec**

Create `e2e/photo-preview.spec.ts`, following `e2e/dashboard.spec.ts`'s out-of-process seeding (the seed runner seeds an order for `e2e-customer@example.com`):

```ts
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

/**
 * Layer B — a customer with an awaiting_assets order uploads a photo and then
 * sees it in the "Photos you sent" gallery, served through the gated asset
 * route. Same out-of-process seeding as dashboard.spec.ts.
 */
function seedOrder(status: string, child: string) {
  execFileSync(
    "node",
    ["--env-file=.env.test", "./node_modules/vitest/vitest.mjs", "run", "--config", "e2e/fixtures/seed.vitest.config.ts"],
    {
      env: {
        ...process.env,
        E2E_SEED_EMAIL: "e2e-customer@example.com",
        E2E_SEED_STATUS: status,
        E2E_SEED_CHILD: child,
      },
      stdio: "inherit",
    },
  );
}

test("@layerB a parent uploads a photo and sees it in the gallery", async ({ page }) => {
  seedOrder("awaiting_assets", "Pip");

  await page.goto("/app");
  await page.getByRole("link").filter({ hasText: "Pip's fairy tale" }).first().click();
  await expect(page).toHaveURL(/\/app\/orders\//);

  // Upload a small generated PNG through the photo-upload form.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.getByRole("button", { name: "Choose photos" }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "pip.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByRole("button", { name: "Send photos" }).click();

  // The order advances to in_production; the page revalidates and the gallery appears.
  await expect(page.getByText("Photos you sent")).toBeVisible({ timeout: 30_000 });
  const img = page.locator('img[src*="/asset/"]').first();
  await expect(img).toBeVisible();
});
```

(If the 1px PNG is too small to produce a `preview` size, the route falls back to the original — the `<img>` still loads. The test asserts visibility, not dimensions.)

- [ ] **Step 2: Run (if a test DB is available)**

Run: `npm run test:e2e`
Expected: all specs pass incl. the new one. No DB/browser in sandbox → defer to CI; confirm the spec at least registers with `npx playwright test --list`.

- [ ] **Step 3: Commit**

```bash
git add e2e/photo-preview.spec.ts
git commit -m "test(e2e): customer uploads a photo and previews it via the gated route"
```

---

### Task 9: Mind maintenance + docs + final review

**Files:**
- Modify: `fairy-tale-mind/map/zones/payload-backend.md` (site-media + optimization + new migration)
- Modify: `fairy-tale-mind/map/zones/auth-gating.md` (new gated asset route + in-app photo preview)
- Create: `fairy-tale-mind/map/decisions/two-media-collections-public-and-gated.md`
- Modify: `fairy-tale-mind/tech-debt/local-disk-video-delivery.md` (photos now also proxy via the gate; private-store work still open and now also covers photos)
- Modify: `fairy-tale-mind/tech-debt/heic-photos-over-cap-rejected.md` (client now always converts HEIC; note residual non-Safari-decode case)
- Modify: `README.md` (one line: site-media vs customer media)
- Regenerate: `fairy-tale-mind/map/index.md` via `npm run mind`

- [ ] **Step 1: New decision record** `two-media-collections-public-and-gated.md` (past tense; mirror an existing record's frontmatter): why two collections (isolate customer PII from public site assets, different access models on one store); why customer media stays gated-public not private (Payload plugin is public-only; the SDK supports private but only outside the plugin; gated proxy already protects; true-private deferred to [[local-disk-video-delivery]]); why no new env var (per-collection options on one public store); the optimization model (server WebP cap + one preview; client HEIC convert).

- [ ] **Step 2: Re-stamp + delta the touched zone cards** to the branch HEAD commit hash:
  - `payload-backend.md`: new `site-media` public collection (disablePayloadAccessControl + `site/` prefix); `media` relabeled, format allow-list, WebP cap + `preview` size; migration `20260613_000000_media_site_media`. Add an invariant: "site-media is public-read/admin-write with direct CDN URLs; media stays adminOnly and is served only through ownership-gated routes."
  - `auth-gating.md`: new gated route `/api/orders/[id]/asset/[assetId]` + the in-app "Photos you sent" gallery; same `assertOwnsOrder` doorway; non-owner 403.

- [ ] **Step 3: Update the two tech-debt notes** as described in Files (don't tombstone — amend).

- [ ] **Step 4: README** — add after the media-relevant section: "Media lives in two collections: `site-media` (public, admin-managed brand imagery, direct CDN URLs) and `media` (customer photos/proofs/videos, access-controlled and served only through ownership-gated routes)."

- [ ] **Step 5: Regenerate + verify**

```bash
npm run mind
npx tsc --noEmit
npx vitest run tests/lib/ tests/app/order-stages.test.ts tests/app/order-upload-validation.test.ts
```
Expected: index regenerated; typecheck clean; non-DB tests pass. Fix anything `npm run mind` flags (stale globs, unresolved routes).

- [ ] **Step 6: Commit**

```bash
git add fairy-tale-mind README.md
git commit -m "docs(mind): two-media-collections decision, zone re-stamps, debt updates; README"
```

- [ ] **Step 7: Final whole-branch review**

Dispatch a final reviewer over the whole diff (base = the commit before Task 1, head = HEAD): cross-task consistency (Media mimeTypes still include the studio's video types; the asset route + resolver + gallery agree on the preview-or-original fallback; the migration matches the collection schemas), security (the asset route gates via `assertOwnsOrder` and confirms `assetId ∈ order.assets`; site-media write is admin-only), and the must-verify-on-deploy items (migration applies; sharp processes each accepted format; a real photo upload produces a `preview` and the gallery renders it).

---

## Post-implementation checklist (user-facing, not tasks)

1. **No new env var** for the chosen gated-public model — the existing `BLOB_READ_WRITE_TOKEN` (one public store) serves both collections.
2. **On a preview deploy:** upload a brand image in `/admin` → `site-media` (confirm a direct `…/site/…` CDN URL and the thumbnail/card/hero sizes); place/seed an order, upload a customer photo, confirm it appears in "Photos you sent" and that a non-owner gets 403 on the asset URL; confirm a large phone photo lands as a bounded WebP.
3. **Migration:** confirm `20260613_000000_media_site_media` applied on boot (deploy logs) and `migrate:status` is clean.
4. **If you later want true-private customer media:** that's the separate project in `fairy-tale-mind/tech-debt/local-disk-video-delivery.md` (private store + token, custom adapter, signed URLs, studio rework, migration).

## Self-review (already applied)

- **Spec coverage:** site-media collection (T1) · customer media optimization + format allow-list + relabel (T2) · migration (T3) · client HEIC convert + server guard (T4) · gated preview resolver (T5) · gated asset route (T6) · in-app gallery (T7) · e2e (T8) · Mind/docs/review (T9). Public-vs-private guidance lives in the spec + decision record (T9).
- **Deferred (flagged):** per-order prefix hardening of customer blobs (schema-risk, optional; gate already protects) — called out at the top and not depended on by any task.
- **Type consistency:** `OwnedAsset { filename, mimeType }`, `resolveOwnedAsset(orderId, assetId)`, `isServerAcceptedImage(mimeType)`, the `preview` imageSize name, and the `/api/orders/[id]/asset/[assetId]` path are used identically across T5–T8.
- **Migration honesty:** T3 derives the authoritative column list from `migrate:create` (repo convention) rather than trusting the skeleton — the one place a DB is required.
