/**
 * Next.js instrumentation — runs once per server instance on startup.
 *
 * We use it to apply pending Payload DB migrations on production boot, so schema
 * changes reach the prod Neon DB without a manual step (the `payload migrate` CLI
 * doesn't run on this stack). The heavy migration module is imported dynamically
 * and ONLY when the guard passes, so the edge runtime and preview/dev never load
 * it. See lib/run-migrations.ts and
 * fairy-tale-mind/specs/2026-06-05-migrate-on-deploy-design.md.
 */
export async function register(): Promise<void> {
  // Inline guard mirrors shouldRunMigrations(); kept here so the edge runtime and
  // non-prod envs skip the dynamic import of the Payload-heavy migration module.
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.VERCEL_ENV === "production"
  ) {
    const { runProductionMigrations } = await import("@/lib/run-migrations");
    await runProductionMigrations();
  }
}
