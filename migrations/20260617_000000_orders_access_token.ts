import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds orders.access_token (text) + orders.access_token_expires_at (timestamptz)
 * + a btree index on access_token: the durable, reusable order-access link
 * (/open/<token>). Additive and idempotent; safe against a dev-pushed schema.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_token" text;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "access_token_expires_at" timestamp(3) with time zone;
    CREATE INDEX IF NOT EXISTS "orders_access_token_idx" ON "orders" USING btree ("access_token");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "orders_access_token_idx";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "access_token_expires_at";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "access_token";
  `);
}
