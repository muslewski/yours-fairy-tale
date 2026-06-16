import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds orders.in_studio_since (date → timestamptz): the moment an order first
 * entered production, stamped once by the app. Drives the customer dashboard's
 * "in the studio for …" live clock (lib/studio-elapsed.ts). Additive and
 * idempotent (IF NOT EXISTS); safe against a dev-pushed schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "in_studio_since" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "in_studio_since";
  `);
}
