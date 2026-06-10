import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Studio panel groundwork: adds the charged amount and the delivery promise
 * to orders.
 *   - orders.amount_total_cents (number → numeric) — set by the Stripe webhook
 *   - orders.promised_by (date → timestamptz)      — auto from film length
 *
 * Idempotent (IF NOT EXISTS), additive only — safe against a dev-pushed schema.
 * VERIFY before merging: with a dev DB available, run
 * `npm run migrate:create -- order_amount_promise` and diff Payload's generated
 * SQL against this file; drizzle naming wins if they differ.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "amount_total_cents" numeric;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promised_by" timestamp(3) with time zone;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "promised_by";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "amount_total_cents";
  `);
}
