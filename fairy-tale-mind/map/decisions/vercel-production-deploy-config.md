---
type: decision
summary: "How the production deploy is wired on Vercel: npm-only lockfile, Neon integration provides the DB URL (POSTGRES_URL, code falls back from DATABASE_URI), and the app secrets (Payload/BA/Stripe/Resend) + prod-specific Stripe webhook secret are set as Production env vars. Domain: www.yoursfairytale.com."
tags: [deployment, checkout, auth, payload]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[auth-gating]]", "[[payload-backend]]", "[[testing]]"]
sources: ["[[dual-lockfiles]]"]
decided: 2026-06-03
supersededBy: ""
---

## Context
First successful production deploy of the integrated app (Payload + Better Auth +
Stripe + Next 16) to Vercel, live on **www.yoursfairytale.com** (and apex
yoursfairytale.com). Every prior prod deploy showed ● Error.

## Decision / how prod is wired
- **Package manager: npm only.** A stale committed `pnpm-lock.yaml` (predating the
  app's 10 deps) made Vercel's `--frozen-lockfile` install abort in ~2s → the *real*
  reason "old version" kept being served (Vercel falls back to the last good build).
  Deleted it; the repo now has only `package-lock.json`, no `packageManager` pin —
  Vercel auto-selects npm from the sole lockfile.
- **Database: the Neon Vercel integration owns it.** It auto-provisions `POSTGRES_URL`
  (pooled) etc. The app reads `DATABASE_URI`; `payload.config.ts` now falls back
  `DATABASE_URI ?? POSTGRES_URL`, so prod uses the integration var with nothing manual
  to set (and no duplicate DB URL to drift).
- **App secrets are Production env vars** (set via `vercel env add`): `PAYLOAD_SECRET`,
  `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_APP_URL=https://www.yoursfairytale.com`, `RESEND_API_KEY`, `RESEND_FROM`,
  and `STRIPE_WEBHOOK_SECRET`.

## Why (the non-obvious bits / gotchas)
- **The prod Stripe webhook secret ≠ the local `stripe listen` secret.** The `whsec_` in
  `.env` only verifies local forwarding. Prod needs its own from a Stripe **Dashboard**
  endpoint (`we_1TeMUoPNnqZRtjXHSQFL5mdE` → `https://www.yoursfairytale.com/api/stripe/webhook`,
  events: checkout.session.completed, charge.refunded, charge.dispute.created). Without
  it, payments succeed but the checkout-gated account/order never gets created.
- **`NEXT_PUBLIC_*` are build-time inlined** — they must exist *before* the build that
  should contain them; adding them after needs a redeploy.
- **Env var changes need a redeploy** to take effect on the running deployment
  (`vercel redeploy <url>`), not just `env add`.
- **`RESEND_TO_OVERRIDE` must stay UNSET in prod** — it redirects all mail to one test
  inbox, so real customers wouldn't get their emails.
- **`trustedOrigins`** in `lib/auth.ts` already lists the prod domains + `*.vercel.app`,
  so magic-link sign-in works on the real domain.

## Consequences
- CI (Node 24) and prod both install with npm. `[[dual-lockfiles]]` tech-debt resolved.
- Still test-mode Stripe keys + `onboarding@resend.dev` sender (Resend domain not yet
  verified) — pre-launch items, not blockers for the deploy itself.
- Verified live: homepage 200, `/app` 307→/sign-in (gating), `/admin` 200, webhook 400
  on unsigned POST (signature check active).
