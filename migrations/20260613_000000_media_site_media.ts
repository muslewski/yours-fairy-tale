import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Two-media-collections groundwork:
 *   - NEW "site_media" upload table (+ size columns for thumbnail/card/hero,
 *     focal point, alt, caption) for the public admin-managed site-media collection.
 *   - NEW "media" preview-size columns (sizes_preview_*) for the customer
 *     in-app photo preview.
 *
 * The column set is verified byte-identical to Payload's own dev-push schema
 * (introspected 2026-06-13).
 *
 * Why each statement runs in its OWN `db.execute` with per-statement error
 * isolation (changed 2026-06-13): Postgres runs a multi-statement simple query
 * inside one implicit transaction, so a single failing statement rolls back the
 * WHOLE batch — which is how an earlier version of this migration failed to
 * create `site_media` on production (one statement threw and took the table
 * create down with it, silently). Running statements independently and
 * idempotently means the `site_media` create and each `media` column land
 * regardless of any single problematic statement. Every statement is
 * `IF NOT EXISTS`, so this is safe to re-run.
 */
const UP_STATEMENTS = [
  sql`CREATE TABLE IF NOT EXISTS "site_media" (
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
    )`,
  sql`CREATE INDEX IF NOT EXISTS "site_media_updated_at_idx" ON "site_media" USING btree ("updated_at")`,
  sql`CREATE INDEX IF NOT EXISTS "site_media_created_at_idx" ON "site_media" USING btree ("created_at")`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "site_media_filename_idx" ON "site_media" USING btree ("filename")`,
  sql`CREATE INDEX IF NOT EXISTS "site_media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "site_media" USING btree ("sizes_thumbnail_filename")`,
  sql`CREATE INDEX IF NOT EXISTS "site_media_sizes_card_sizes_card_filename_idx" ON "site_media" USING btree ("sizes_card_filename")`,
  sql`CREATE INDEX IF NOT EXISTS "site_media_sizes_hero_sizes_hero_filename_idx" ON "site_media" USING btree ("sizes_hero_filename")`,
  sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_url" varchar`,
  sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_width" numeric`,
  sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_height" numeric`,
  sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_mime_type" varchar`,
  sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_filesize" numeric`,
  sql`ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_preview_filename" varchar`,
  sql`CREATE INDEX IF NOT EXISTS "media_sizes_preview_sizes_preview_filename_idx" ON "media" USING btree ("sizes_preview_filename")`,
];

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const statement of UP_STATEMENTS) {
    try {
      await db.execute(statement);
    } catch (err) {
      // Isolate: one statement's failure must not roll back the others. Logged
      // loudly so a genuinely-bad statement is still visible.
      console.error(
        "[migration 20260613_000000] statement failed (continuing):",
        err,
      );
    }
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "site_media"`);
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_filename"`);
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_filesize"`);
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_mime_type"`);
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_height"`);
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_width"`);
  await db.execute(sql`ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_preview_url"`);
}
