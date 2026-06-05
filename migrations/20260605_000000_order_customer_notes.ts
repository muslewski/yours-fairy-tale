import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the table backing the Orders `customerNotes` array field:
 *   - orders_customer_notes (the parent-scoped note rows)
 *
 * This field shipped with the OrderNotes feature AFTER the prod DB was last
 * schema'd (see tech-debt/no-production-db-migrations.md), so prod was missing
 * the table entirely. Because Payload SELECTs every configured field, even
 * *reading* an order joined to this table — which the dashboard /app and the
 * order detail page both do — failed with `relation "orders_customer_notes"
 * does not exist` (Postgres 42P01) and 500'd in production.
 *
 * Columns mirror Payload's drizzle output for an `array` field under a uuid-PK
 * collection: `_order` (array position), `_parent_id` (uuid FK → orders.id),
 * `id` (varchar row id), plus the two subfields `message` and `created_at`.
 *
 * The `up` is intentionally idempotent (IF NOT EXISTS / duplicate_object guard)
 * so it can be applied to a prod DB whose precise state is unknown — it only
 * ADDS, never drops.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "orders_customer_notes" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "message" varchar NOT NULL,
      "created_at" timestamp(3) with time zone
    );

    DO $$ BEGIN
      ALTER TABLE "orders_customer_notes"
        ADD CONSTRAINT "orders_customer_notes_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "orders"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "orders_customer_notes_order_idx"
      ON "orders_customer_notes" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "orders_customer_notes_parent_id_idx"
      ON "orders_customer_notes" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "orders_customer_notes";
  `);
}
