import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the configurator-wizard fields to the Orders collection:
 *   - orders.extra_minutes (number)
 *   - orders.plot_note     (textarea → varchar)
 *   - orders_texts         (shared table backing the addOns hasMany text field)
 *
 * The exact shapes mirror what Payload's dev push created on the Neon test branch
 * (introspected, not guessed). The `up` is intentionally idempotent (IF NOT EXISTS /
 * duplicate_object guard) so it can be applied to an existing production database whose
 * precise state is unknown — it only ADDS, never drops.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "extra_minutes" numeric DEFAULT 0;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "plot_note" varchar;

    CREATE TABLE IF NOT EXISTS "orders_texts" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer NOT NULL,
      "parent_id" uuid NOT NULL,
      "path" varchar NOT NULL,
      "text" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "orders_texts"
        ADD CONSTRAINT "orders_texts_parent_fk"
        FOREIGN KEY ("parent_id") REFERENCES "orders"("id") ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "orders_texts_order_parent"
      ON "orders_texts" USING btree ("order","parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "orders_texts";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "plot_note";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "extra_minutes";
  `);
}
