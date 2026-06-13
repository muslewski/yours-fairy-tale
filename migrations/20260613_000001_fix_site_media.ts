import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Fix for the production 500 on /api/site-media after 20260613_000000.
 *
 * Root cause: on production the `site_media` table ended up in a malformed
 * state (the original migration did not apply cleanly there — a partial/raced
 * apply), and its `CREATE TABLE IF NOT EXISTS` then no-op'd over the bad table.
 * The original SQL is itself correct: applied to a fresh DB it produces a table
 * byte-identical to Payload's own dev-push schema (verified). The problem is
 * purely the prod table's state, not the column list.
 *
 * `site_media` is brand-new and empty (nothing has been uploaded to it yet and
 * no collection relates to it), so the safe, state-independent fix is to DROP
 * and recreate it to the verified-correct schema — this converges prod from any
 * state (missing / partial / malformed / already-correct) to correct. The
 * `media` preview-size columns are re-asserted additively (ADD COLUMN IF NOT
 * EXISTS) in case 20260613_000000 also failed to apply them.
 *
 * Column list verified against `payloadcms` dev push (information_schema) on
 * 2026-06-13 — identical to 20260613_000000's CREATE TABLE.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_media";
    CREATE TABLE "site_media" (
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
