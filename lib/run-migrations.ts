/**
 * Production migration runner — applies committed Payload migrations to the prod
 * DB automatically on server boot (called from `instrumentation.ts`).
 *
 * Why this exists: Payload's db-postgres only runs `drizzle push` when
 * NODE_ENV !== 'production', and the `payload migrate` CLI does not run on this
 * stack (its tsx loader can't resolve the extensionless imports in
 * payload.config.ts under `moduleResolution: "bundler"`). Calling
 * `payload.db.migrate()` from inside the app sidesteps that — it uses Next's own
 * module resolution. See fairy-tale-mind/specs/2026-06-05-migrate-on-deploy-design.md
 * and tech-debt/no-production-db-migrations.md.
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
  migrate: (args?: { migrations?: typeof migrations }) => Promise<void>;
}

/**
 * Apply any not-yet-applied migrations to the prod DB. No-op unless the guard
 * passes. A blocking advisory lock ensures that when several instances cold-start
 * together, one migrates while the others wait, then find nothing pending. Never
 * throws: a migration failure is logged loudly but must not crash the boot of an
 * already-live site.
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

      // Payload writes a `dev` marker (batch -1) into payload_migrations when the
      // schema is dev-pushed (this prod DB was push-initialized). With that marker
      // present, payload.db.migrate() triggers an INTERACTIVE confirm prompt —
      // which in this non-TTY server context resolves to "no" and calls
      // process.exit(0), silently aborting WITHOUT running migrations and without
      // throwing. Drop the marker first so migrate() runs the committed files
      // non-interactively. Our migrations are idempotent (CREATE/ALTER ... IF NOT
      // EXISTS), so re-running them against the already-pushed schema is a no-op.
      const hasTable = (
        await client.query(
          "SELECT to_regclass('public.payload_migrations') IS NOT NULL AS e",
        )
      ).rows[0].e;
      if (hasTable) {
        const res = await client.query(
          "DELETE FROM payload_migrations WHERE batch = -1",
        );
        if (res.rowCount) {
          console.log(`[migrate-on-boot] cleared ${res.rowCount} dev-push marker(s)`);
        }
      }

      // Pass the bundled migrations explicitly. Otherwise Payload calls
      // readMigrationFiles(), which imports the .ts files from disk at runtime —
      // and Node can't load .ts in the bundled (CommonJS) Vercel function. The
      // index is compiled into the bundle by Next, so its up/down fns are ready.
      await db.migrate({ migrations });
      console.log("[migrate-on-boot] migrations up to date");
    } finally {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error("[migrate-on-boot] production migration failed:", err);
  }
}
