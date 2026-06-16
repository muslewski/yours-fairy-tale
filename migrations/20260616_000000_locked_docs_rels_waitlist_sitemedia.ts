import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Repair migration: add the polymorphic relationship columns for the `waitlist`
 * and `site-media` collections to the shared `payload_locked_documents_rels`
 * table.
 *
 * ROOT CAUSE: the waitlist (20260610) and site-media (20260613) migrations
 * created those collections' own tables but never ALTERed the shared polymorphic
 * `payload_locked_documents_rels` table to add the `<slug>_id` columns Payload
 * expects (one per collection). Payload references that table's FULL column set
 * on EVERY document delete (admin edit-lock cleanup). On production — which runs
 * migrations only — any delete therefore generated SQL referencing the missing
 * `waitlist_id` / `site_media_id` columns, which aborted the transaction
 * (Postgres 25P02 "current transaction is aborted"). That broke magic-link
 * sign-in: the verify step DELETEs the verification token, so every sign-in
 * failed (sessions table stayed empty; verification tokens piled up unconsumed).
 * Dev/test never reproduced it because Payload's dev schema-push had already
 * added the columns.
 *
 * The column / FK / index shapes here are byte-identical to Payload's dev-push
 * schema (introspected from the synced test branch on 2026-06-16). Every
 * statement is idempotent and isolated so re-runs and partial states are safe
 * (same posture as 20260613_000000_media_site_media).
 */
const UP_STATEMENTS = [
  sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "waitlist_id" uuid`,
  sql`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "site_media_id" uuid`,
  sql`DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_waitlist_fk"
      FOREIGN KEY ("waitlist_id") REFERENCES "waitlist"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  sql`DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels"
      ADD CONSTRAINT "payload_locked_documents_rels_site_media_fk"
      FOREIGN KEY ("site_media_id") REFERENCES "site_media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  sql`CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_waitlist_id_idx" ON "payload_locked_documents_rels" USING btree ("waitlist_id")`,
  sql`CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_site_media_id_idx" ON "payload_locked_documents_rels" USING btree ("site_media_id")`,
];

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const statement of UP_STATEMENTS) {
    try {
      await db.execute(statement);
    } catch (err) {
      // Isolate: one statement's failure must not roll back the others.
      console.error(
        "[migration 20260616_000000] statement failed (continuing):",
        err,
      );
    }
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "site_media_id"`,
  );
  await db.execute(
    sql`ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "waitlist_id"`,
  );
}
