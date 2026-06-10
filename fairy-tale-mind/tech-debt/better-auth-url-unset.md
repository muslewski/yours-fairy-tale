---
type: debt
summary: "BETTER_AUTH_URL is not set in production. Better Auth logs 'Base URL could not be determined' and infers the host from the request — works today, but fragile for callbacks/redirects."
tags: [auth, config, hardening]
status: resolved
created: 2026-06-04
updated: 2026-06-10
severity: low
related: ["[[auth-gating]]", "[[magic-link-confirmation-interstitial]]", "[[prod-env-fail-closed]]"]
---

## Resolved 2026-06-10
`BETTER_AUTH_URL` is now part of the 9-var required production env contract
(`lib/required-env.ts`): a production deploy without it fails closed at boot (see
`[[prod-env-fail-closed]]`), and it is documented in `.env.example`. The launch
hardening also documented in `lib/auth.ts` that BETTER_AUTH_URL is the load-bearing
origin trust (the VERCEL_* trustedOrigins loop is best-effort breadth only).
Remaining ops step (launch checklist, not debt): actually set the var in the Vercel
environment — the boot guard makes forgetting it impossible to miss.

## What
During the magic-link debugging (2026-06-04) the server logged:

> [Better Auth]: Base URL could not be determined. Please set a valid base URL
> using the baseURL config option or the BETTER_AUTH_URL environment variable.
> Without this, callbacks and redirects may not work correctly.

`lib/auth.ts` does not pass `baseURL`, and `BETTER_AUTH_URL` is not set in the
Vercel environment. Better Auth falls back to inferring the origin from the request
headers, which has worked (the production magic-link host resolved to
`www.yoursfairytale.com`), but is fragile.

## Fix
Set `BETTER_AUTH_URL=https://www.yoursfairytale.com` in the Vercel production (and
preview) environment, or pass `baseURL` explicitly in `betterAuth({ ... })`. Then
the warning disappears and origin-dependent flows are deterministic.

## Why deferred
Not the cause of the INVALID_TOKEN bug (that was single-use token pre-consumption,
fixed via the confirmation interstitial). Inference works today, so this is
low-severity hardening rather than an active failure.
