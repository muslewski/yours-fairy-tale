---
type: debt
summary: "Three follow-ups from the durable /open order-access link (2026-06-17): (1) lib/order-tracking-link.ts / createOrderTrackingLink is now misnamed — the order emails moved to the /open link, so its ONLY remaining callers are the agent-mcp test tools, where it's a general 'sign in as this email → callbackURL' minter; consider renaming to e.g. magic-signin-link. (2) The /open host comes from NEXT_PUBLIC_APP_URL in the status email but BETTER_AUTH_URL in the webhook — both default to the canonical www host, but the split is an inconsistency. (3) Security hardening options the brand owner deferred: a studio 'regenerate access link' (rotate accessToken to revoke a leaked link) and a one-tap 'Open my preview' button (block passive link-prefetch from completing the sign-in)."
tags: [auth, email, naming, security]
status: open
created: 2026-06-17
related: ["[[auth-gating]]", "[[checkout]]", "[[2026-06-17-durable-order-access-link]]"]
sources:
  - "lib/order-tracking-link.ts"
  - "tools/agent-mcp/tools/auth.ts"
  - "tools/agent-mcp/tools/orders.ts"
  - "lib/order-status-email.ts"
  - "app/api/stripe/webhook/route.ts"
severity: low
effort: medium
---

## Problem
The durable `/open/<token>` order-access link (see
`[[2026-06-17-durable-order-access-link]]`) shipped, but left three loose ends —
none blocking, all worth a future pass.

### 1. `order-tracking-link.ts` is now misnamed
The plan intended to delete `lib/order-tracking-link.ts` ("the only callers are
the two email builders"). The planning grep was scoped to `app lib tests` and
missed `tools/`. The real remaining callers are:
- `tools/agent-mcp/tools/auth.ts` → `mintLoginLink(email, baseUrl, callbackURL)`
  — "Mint a magic sign-in link so Playwright can authenticate as the customer."
- `tools/agent-mcp/tools/orders.ts` → `mintTrackingLink(email)` — returns a
  sign-in link (callbackURL `/app`) from `createOrder`.

Both use it as a **general** "sign in as this email, land on this callbackURL"
minter for test/agent automation — which the order-scoped `/open/<token>` link
can't serve (it resolves a token → that one order; it isn't keyed by an
arbitrary email + callbackURL). So the module is correctly **retained**, but its
`OrderTracking` name now describes a job it no longer does for the product.
Fix: rename to something like `lib/magic-signin-link.ts` /
`createMagicSigninLink` and update the two agent-mcp callers + the test. Cosmetic;
do it when next touching that area.

### 2. `/open` host env-var split
`lib/order-status-email.ts` builds the `/open/` base from `NEXT_PUBLIC_APP_URL`;
`app/api/stripe/webhook/route.ts` builds it from `BETTER_AUTH_URL`. Both default
to `https://www.yoursfairytale.com` and `lib/required-env.ts` requires both in
prod, so in practice the host is identical — but the divergence is a latent
inconsistency. Pick one canonical source for customer-facing link hosts.

### 3. Deferred security hardening (accepted trade-off)
The reusable 30-day link grants a session to anyone holding it (forwarded email /
prefetcher). The brand owner accepted this; two mitigations were noted as future
options, NOT built:
- A studio **"regenerate access link"** action: rotate `orders.accessToken` to
  instantly revoke a leaked link.
- A one-tap **"Open my preview"** button on a landing page instead of an
  auto-redirect, so a passive link-prefetcher can't silently complete the
  sign-in and keep cookies.
