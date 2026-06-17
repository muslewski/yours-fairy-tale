import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds orders.proof_url + orders.final_video_url (text): the studio's external
 * delivery links for the preview and final film. Additive + idempotent; safe
 * against a dev-pushed schema. No index (never looked up by value).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "proof_url" text;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "final_video_url" text;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "final_video_url";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "proof_url";
  `);
}
