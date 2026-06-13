import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Two-media-collections groundwork:
 *   - NEW "site_media" upload table (+ size columns for thumbnail/card/hero,
 *     focal point, alt, caption) for the public admin-managed site-media collection.
 *   - NEW "media" preview-size columns (sizes_preview_*) for the customer
 *     in-app photo preview.
 *
 * Column lists below mirror Payload's drizzle output for upload collections and
 * are idempotent (IF NOT EXISTS), additive only. ⚠ VERIFY before merge: run
 * `npm run migrate:create -- media_site_media` against a dev DB and diff the
 * generated SQL against this file — Payload's drizzle naming wins if anything
 * differs (e.g. a separate site_media_sizes table, thumbnail_u_r_l casing, or a
 * `prefix` column the plugin materializes). No prior tracked migration creates
 * the `media` table (it landed via an early drizzle push), so there is no
 * in-repo precedent to reconcile this naming against — the dev-DB diff is the
 * only authority.
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
