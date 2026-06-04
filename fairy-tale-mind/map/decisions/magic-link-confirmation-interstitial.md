---
type: decision
summary: "Magic-link emails point at a confirmation interstitial (/sign-in/verify), not the raw Better Auth verify endpoint. The verify endpoint consumes the single-use token on the FIRST GET, so email scanners / link-preview bots that pre-fetch the link burned it before the human clicked (INVALID_TOKEN). The interstitial consumes nothing on GET; a native GET form (human submit, which crawlers don't perform) reaches verify exactly once."
tags: [auth, magic-link, email, bugfix]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[auth-gating]]", "[[branded-email-template]]"]
sources: []
decided: 2026-06-04
supersededBy: ""
---

## Context
First real magic-link emails failed: clicking the link landed on
`/sign-in?next=/app?error=INVALID_TOKEN` instead of signing in.

Investigation (systematic-debugging, reproduced against the Neon test branch):
Better Auth's magic-link verify token is **single-use, consumed atomically on the
first GET** (`consumeVerificationValue` find-and-deletes; the plugin's
`allowedAttempts` warning confirms it can't be relaxed — GHSA-hc7v-rggr-4hvx).
We emailed a link straight to `/api/auth/magic-link/verify`. In production an
automated GET hits that URL before the human — email security scanners (SafeLinks
etc.), link-preview bots, antivirus proxies, or a click-tracking redirect — and
consumes the token. The human's click then finds nothing → `INVALID_TOKEN`. It is
NOT expiry (that's a distinct `EXPIRED_TOKEN`) and NOT a DB/adapter bug (a clean
single GET works, which the e2e fixture proves). Reproduced by GETting the verify
URL twice: 1st succeeds, 2nd → `INVALID_TOKEN`.

## Decision
`sendMagicLink` rewrites the verify URL to a confirmation interstitial via
`toConfirmSignInUrl` (`lib/auth-confirm-url.ts`): the email links to
`/sign-in/verify?token=…&callbackURL=…` (`app/(app)/sign-in/verify/page.tsx`).
That page is a plain server component that **never calls the auth API**, so any GET
(scanner, preview, prefetch) consumes nothing. It renders a **native
`<form method="GET" action="/api/auth/magic-link/verify">`** with the token +
(sanitized, relative-only) callbackURL as hidden fields. A human pressing
"Confirm sign-in" performs a real document navigation to the verify endpoint, whose
302 is followed to `/app` — the token is consumed exactly once, by the real person.

A first attempt used a POST server action that `redirect()`ed to the verify route
handler; that does a client-router navigation, not a document GET, so the verify
302 wasn't followed (the browser sat on the verify URL). The native GET form is the
correct mechanism.

## Why this is scanner-safe
Link crawlers follow `<a href>` targets; they do not submit forms. The only `href`
in the email now points at the interstitial (safe to GET). The consuming endpoint
is reachable only by submitting the form. One extra human click is the cost.

## Consequences
- The e2e auth fixture simulates a scanner pre-fetch GET of the link, then the human
  confirm, and still reaches `/app` — a standing regression guard.
- The dev `console.log` + Playwright file-sink now emit the interstitial URL.
- Hardening (separate, filed as tech-debt): set `BETTER_AUTH_URL` in prod — Better
  Auth logged "Base URL could not be determined"; it currently infers the host from
  the request, which works but is fragile.
