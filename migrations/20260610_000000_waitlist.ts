import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the table backing the new `waitlist` collection (Series waitlist
 * signups). Columns mirror Payload's drizzle output for a uuid-PK collection
 * with a unique email field and timestamps. Idempotent (IF NOT EXISTS) so it
 * is safe against a dev-pushed schema.
 *
 * VERIFY before merging: with a dev DB available, run
 * `npm run migrate:create -- waitlist` and diff the generated SQL against this
 * file; Payload's drizzle naming must win if they differ.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "waitlist" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "email" varchar NOT NULL,
      "source" varchar,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "waitlist_email_idx"
      ON "waitlist" USING btree ("email");
    CREATE INDEX IF NOT EXISTS "waitlist_updated_at_idx"
      ON "waitlist" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "waitlist_created_at_idx"
      ON "waitlist" USING btree ("created_at");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "waitlist";
  `);
}
