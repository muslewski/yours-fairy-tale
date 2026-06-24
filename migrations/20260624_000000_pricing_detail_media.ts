import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the per-detail-level preview fields to the `pricing` Global's
 * `pricing_details` array table: `title` + `description` text columns and an
 * `image_id` upload relationship to the public `site_media` collection.
 *
 * ADD-only and idempotent (IF NOT EXISTS / duplicate_object guard), matching the
 * sibling migrations' posture. ON DELETE SET NULL: removing a site-media asset
 * blanks the reference rather than deleting the detail-level row.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "description" varchar;
    ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "image_id" uuid;

    DO $$ BEGIN
      ALTER TABLE "pricing_details"
        ADD CONSTRAINT "pricing_details_image_id_site_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "site_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "pricing_details_image_idx" ON "pricing_details" USING btree ("image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "pricing_details_image_idx";
    ALTER TABLE "pricing_details" DROP COLUMN IF EXISTS "image_id";
    ALTER TABLE "pricing_details" DROP COLUMN IF EXISTS "description";
    ALTER TABLE "pricing_details" DROP COLUMN IF EXISTS "title";
  `);
}
