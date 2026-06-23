import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the tables backing the new `pricing` Global (admin-editable configurator
 * pricing): the singleton `pricing` row plus its three array tables
 * (`pricing_lengths`, `pricing_details`, `pricing_add_ons`).
 *
 * Columns/indexes/FKs mirror exactly what Payload's dev `push` created
 * (introspected via pg_dump, not guessed). Idempotent (IF NOT EXISTS) and
 * ADD-only, so it is safe against a dev-pushed schema or an existing production
 * DB whose precise state is unknown — same posture as the sibling migrations.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "pricing" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "extra_minute_price" numeric DEFAULT 55 NOT NULL,
      "max_extra_minutes" numeric DEFAULT 30 NOT NULL,
      "updated_at" timestamp(3) with time zone,
      "created_at" timestamp(3) with time zone
    );

    CREATE TABLE IF NOT EXISTS "pricing_lengths" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "minutes" numeric NOT NULL,
      "price" numeric NOT NULL,
      "note" varchar
    );

    CREATE TABLE IF NOT EXISTS "pricing_details" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "multiplier" numeric NOT NULL,
      "note" varchar
    );

    CREATE TABLE IF NOT EXISTS "pricing_add_ons" (
      "_order" integer NOT NULL,
      "_parent_id" uuid NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar NOT NULL,
      "price" numeric NOT NULL,
      "note" varchar
    );

    DO $$ BEGIN
      ALTER TABLE "pricing_lengths"
        ADD CONSTRAINT "pricing_lengths_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pricing"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "pricing_details"
        ADD CONSTRAINT "pricing_details_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pricing"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN
      ALTER TABLE "pricing_add_ons"
        ADD CONSTRAINT "pricing_add_ons_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pricing"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "pricing_lengths_order_idx" ON "pricing_lengths" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "pricing_lengths_parent_id_idx" ON "pricing_lengths" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "pricing_details_order_idx" ON "pricing_details" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "pricing_details_parent_id_idx" ON "pricing_details" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "pricing_add_ons_order_idx" ON "pricing_add_ons" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "pricing_add_ons_parent_id_idx" ON "pricing_add_ons" USING btree ("_parent_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "pricing_lengths";
    DROP TABLE IF EXISTS "pricing_details";
    DROP TABLE IF EXISTS "pricing_add_ons";
    DROP TABLE IF EXISTS "pricing";
  `);
}
