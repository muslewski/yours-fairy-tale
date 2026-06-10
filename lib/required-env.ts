/**
 * Production env contract — the single list of vars a real deploy MUST have.
 *
 * Checked fail-closed in instrumentation.ts on production boot: a deploy with
 * a missing var 500s every request instead of silently degrading (e.g. a
 * missing RESEND_API_KEY would otherwise disable magic-link sign-in — the ONLY
 * sign-in path — with nothing but a console.warn as evidence).
 *
 * DATABASE_URI/POSTGRES_URL, PAYLOAD_SECRET, BETTER_AUTH_SECRET and
 * STRIPE_SECRET_KEY already fail-fast at module import; they are listed here
 * too so the boot error names EVERYTHING missing at once.
 */
export const REQUIRED_PRODUCTION_ENV = [
  "PAYLOAD_SECRET",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM",
  "NEXT_PUBLIC_APP_URL",
  "BLOB_READ_WRITE_TOKEN",
] as const satisfies readonly string[];

export function missingProductionEnv(
  env: Record<string, string | undefined>,
): string[] {
  return REQUIRED_PRODUCTION_ENV.filter((key) => !env[key]);
}
