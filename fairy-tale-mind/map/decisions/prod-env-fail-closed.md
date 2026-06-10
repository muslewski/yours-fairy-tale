---
type: decision
summary: "Production boot fails CLOSED: instrumentation.ts throws on any missing var from the 9-var contract in lib/required-env.ts, 500ing every request — a loud dead deploy beats a silent half-working one. Deliberately asymmetric with run-migrations' never-throw. Open gate: register()-throw semantics must be confirmed on a real Vercel preview."
tags: [deployment, config, reliability, vercel]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[payload-backend]]", "[[checkout]]", "[[auth-gating]]", "[[migrate-on-deploy-via-instrumentation]]", "[[better-auth-url-unset]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
Several env vars degraded SILENTLY when missing in production: no `RESEND_API_KEY`
meant `sendEmail` warn-and-skipped — disabling magic-link sign-in (the ONLY sign-in
path) and order confirmations with nothing but a console.warn as evidence; no
`RESEND_FROM` silently fell back to the resend.dev sandbox sender; no
`BETTER_AUTH_URL` left origin trust to header inference (see
`[[better-auth-url-unset]]`). A deploy could look green while its core flows were
broken.

## Decision
- `lib/required-env.ts` defines the single 9-var production contract
  (`PAYLOAD_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL`,
  `BLOB_READ_WRITE_TOKEN`) plus the pure `missingProductionEnv()` (unit-tested).
- `instrumentation.ts` `register()` (prod Node runtime only) checks the contract
  BEFORE running migrations and **throws** naming every missing var at once — the
  deploy 500s every request: loud, visible, safe.
- `lib/email.ts` independently throws in production when `RESEND_API_KEY` or
  `RESEND_FROM` is missing (defense in depth; dev keeps warn+skip / the sandbox
  sender).
- Vars that already fail-fast at module import (secrets, Stripe key) are listed in
  the contract anyway so ONE boot error names everything missing.

## Why
- A silent half-working deploy is strictly worse than a loud 500: customers hit
  invisible failures (no sign-in email, localhost success_urls) that may go
  unnoticed for days; a dead deploy is noticed and rolled back in minutes.
- **The asymmetry with `run-migrations` is deliberate**: a missing env var means
  the deploy NEVER worked, so killing it costs nothing — whereas a failed migration
  runs on an already-live site, and throwing there would take down a working
  deployment (`runProductionMigrations` logs and never throws, see
  `[[migrate-on-deploy-via-instrumentation]]`). Fail closed on config; fail open on
  migration.

## Consequences
- Every new load-bearing env var must be added to `REQUIRED_PRODUCTION_ENV` (and
  `.env.example`) or prod boot won't defend it.
- This boot-requires `BETTER_AUTH_URL`, resolving the `better-auth-url-unset` debt
  (it is also documented in `.env.example`).
- **Open verification gate:** a reviewer could not confirm from the installed Next
  build (restructured dist) that an `instrumentation.ts` `register()` throw
  actually fails requests on Vercel. Before the fail-closed guarantee is trusted,
  deploy a preview with one required var deliberately unset and observe that
  requests 500. Tracked in the `verify-fail-closed-boot-on-vercel` tech-debt note.
