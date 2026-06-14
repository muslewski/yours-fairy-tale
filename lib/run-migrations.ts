/**
 * Production migration runner — applies committed Payload migrations to the prod
 * DB automatically on server boot (called from `instrumentation.ts`).
 *
 * Why this exists: Payload's db-postgres only runs `drizzle push` when
 * NODE_ENV !== 'production', and the `payload migrate` CLI does not run on this
 * stack (its tsx loader can't resolve the extensionless imports in
 * payload.config.ts under `moduleResolution: "bundler"`). So migrations must be
 * applied from inside the app. See
 * fairy-tale-mind/specs/2026-06-05-migrate-on-deploy-design.md.
 *
 * Why we do NOT call `payload.db.migrate()` (changed 2026-06-13): Payload's
 * migrate runs each migration inside a transaction and, on ANY error in a
 * migration's `up()`, calls `process.exit(1)` (see
 * @payloadcms/drizzle/dist/migrate.js → runMigrationFile). In the serverless
 * runtime that KILLS the instance before this module's own try/catch can log
 * anything, the migration is never recorded, and every subsequent cold-start
 * dies at the same migration — so nothing after it ever applies, silently. (That
 * is exactly how the `site_media` migration failed to reach prod.) Instead we
 * apply each bundled migration's `up()` ourselves, in its own try/catch that
 * LOGS and CONTINUES — one bad migration can never crash the boot or block the
 * others. Our migrations are idempotent DDL (CREATE/ALTER ... IF NOT EXISTS), so
 * re-running a partially-applied one on the next boot simply converges.
 */
import type { Pool } from "pg";

import { getPayloadClient } from "@/lib/payload";
import { migrations } from "@/migrations";

/**
 * A fixed, app-wide key for the Postgres advisory lock that serializes migration
 * runs across concurrently-booting instances. Arbitrary but stable — every
 * instance of this app must use the same number.
 */
const MIGRATION_LOCK_KEY = 8276_2026;

/**
 * The guard. Migrations may run ONLY on the production Node runtime. Preview
 * deploys share the prod POSTGRES_URL, so preview/edge/local must never reach the
 * migrate call. Pure and side-effect-free so it can be unit-tested.
 */
export function shouldRunMigrations(env: {
  runtime?: string;
  vercelEnv?: string;
}): boolean {
  return env.runtime === "nodejs" && env.vercelEnv === "production";
}

/** The slice of the Payload postgres adapter this runner needs. */
interface MigratableDb {
  pool: Pool;
  /** The drizzle instance — `migration.up({ db })` calls `db.execute(sql)`. */
  drizzle: { execute: (query: unknown) => Promise<unknown> };
}

/**
 * Apply any not-yet-recorded migrations to the prod DB. No-op unless the guard
 * passes. A blocking advisory lock ensures that when several instances cold-start
 * together, one migrates while the others wait. Never throws, and never lets a
 * single failing migration take down the boot.
 */
export async function runProductionMigrations(): Promise<void> {
  if (
    !shouldRunMigrations({
      runtime: process.env.NEXT_RUNTIME,
      vercelEnv: process.env.VERCEL_ENV,
    })
  ) {
    return;
  }

  try {
    const payload = await getPayloadClient();
    const db = payload.db as unknown as MigratableDb;
    const client = await db.pool.connect();
    try {
      await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);

      // The payload_migrations bookkeeping table. Payload normally creates it;
      // ensure it exists so our raw reads/writes are safe on a fresh DB too.
      await client.query(
        `CREATE TABLE IF NOT EXISTS "payload_migrations" (
           "id" serial PRIMARY KEY,
           "name" varchar,
           "batch" numeric,
           "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
           "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
         )`,
      );

      // Payload writes a `dev` marker (batch -1) when the schema is dev-pushed
      // (this prod DB was push-initialized). Drop it so it never confuses the
      // batch numbering or triggers Payload's interactive dev-push prompt.
      await client.query("DELETE FROM payload_migrations WHERE batch = -1");

      const recorded = new Set(
        (await client.query("SELECT name FROM payload_migrations")).rows.map(
          (r) => r.name as string,
        ),
      );
      const nextBatch = Number(
        (
          await client.query(
            "SELECT COALESCE(MAX(batch), 0) + 1 AS n FROM payload_migrations WHERE batch > 0",
          )
        ).rows[0].n,
      );

      let applied = 0;
      let failed = 0;
      for (const migration of migrations) {
        if (recorded.has(migration.name)) continue;
        try {
          // up() runs against the (non-transactional) drizzle instance. No
          // process.exit on error here — see the module header.
          await migration.up({
            db: db.drizzle,
            payload,
            req: {},
          } as unknown as Parameters<typeof migration.up>[0]);
          await client.query(
            "INSERT INTO payload_migrations (name, batch) VALUES ($1, $2)",
            [migration.name, nextBatch],
          );
          applied += 1;
          console.log(`[migrate-on-boot] applied ${migration.name}`);
        } catch (err) {
          failed += 1;
          console.error(
            `[migrate-on-boot] migration ${migration.name} failed (continuing):`,
            err,
          );
        }
      }
      console.log(
        `[migrate-on-boot] done — ${applied} applied, ${failed} failed, ${migrations.length} total`,
      );
    } finally {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error("[migrate-on-boot] production migration runner failed:", err);
  }
}
