---
type: decision
summary: "Order emails (preview-ready / delivered / order-confirmation) link a DURABLE, reusable /open/<token> order-access link (orders.accessToken, 30-day, refreshed per send) instead of a single-use 7-day Better Auth magic-link behind the confirm interstitial. /open re-mints a short-lived internal magic-link verification and hands off to auth.api.magicLinkVerify server-side, so it reuses BA's real verify→session flow and signs the customer in instantly with no interstitial. Supersedes lib/order-tracking-link.ts FOR THE ORDER EMAILS only; that module is RETAINED because the agent-mcp test tooling still uses it as a general magic-sign-in-link minter. The interactive sign-in magic link is unchanged."
tags: [auth, customer-area, email]
status: active
created: 2026-06-17
related: ["[[auth-gating]]", "[[checkout]]", "[[prod-better-auth-url-canonical]]"]
sources:
  - "lib/order-access.ts"
  - "lib/order-access-token.ts"
  - "app/(site)/(app)/open/[token]/route.ts"
  - "fairy-tale-mind/specs/2026-06-17-durable-order-access-link-design.md"
decided: 2026-06-17
supersededBy: ""
---

## Context
The "watch your preview" email linked a single-use, 7-day Better Auth magic-link
token behind the `/sign-in/verify` confirm interstitial. A second click, a
double-submit, or opening the email a few days later → "this link has expired or
was already used", defeating the link's purpose. Receiving the email at the order
address already proves ownership, so the link shouldn't behave like a one-shot
sign-in.

## Decision
- Each order carries `accessToken` + `accessTokenExpiresAt` (30 days, refreshed on
  every status email). The durable token is **never consumed**.
- Status + confirmation emails link `/open/<token>`. That public route handler
  (`app/(site)/(app)/open/[token]/route.ts` — route handlers don't inherit the
  `/app` gate, and the page sibling `/open/expired` lives outside it too) resolves
  the order, re-mints a SHORT-LIVED (10-min, single-use) internal BA magic-link
  verification for the owner, and returns `auth.api.magicLinkVerify({asResponse:true})`
  — session cookie + 302 to the order, instantly, no interstitial. A returned
  `?error=` redirect (e.g. owner vanished between resolve and verify) is normalized
  back to `/open/expired`.
- Expired/unknown token → `/open/expired` ("sign in with your email", links to
  `/sign-in`). No order id is leaked on any failure path (constant-shape redirect).
- The interactive **sign-in** magic link is UNCHANGED (short, single-use,
  interstitial-protected).

## Why
- Reuses BA's real verify→session path (the exact flow the old order-tracking-link
  test proved end-to-end) rather than hand-rolling sessions. `disableSignUp: true`
  is fine — the order owner is an existing webhook-created user, so verify signs
  them in rather than rejecting.
- Reusable + 30-day matches how parents actually open order emails.

## Consequences / trade-off
- A reusable emailed link grants a full customer session to anyone holding it for
  ≤30 days (a forwarded email, or a link-prefetcher that completes the redirect and
  keeps cookies). Blast radius: the customer's own orders + profile — no payment or
  PII *editing* beyond what they already see. Accepted by the brand owner for
  preview convenience; mitigations = the 30-day cap + the "sign in again" fallback.
  A one-tap "Open my preview" button (blocks passive prefetch) and a studio
  "regenerate link" (revoke a leaked link) are noted future options — see
  `[[durable-order-access-link-followups]]`.
- New column `orders.access_token` (+ `_expires_at`, btree-indexed); migration
  `20260617_000000_orders_access_token` (additive + idempotent).
- `lib/order-tracking-link.ts` is **NOT removed** (the plan's grep scope missed
  `tools/`): `tools/agent-mcp/tools/auth.ts` (`mintLoginLink`) and
  `tools/agent-mcp/tools/orders.ts` (`mintTrackingLink`) still call
  `createOrderTrackingLink` as a general "sign in as this email → callbackURL"
  minter for Playwright/agent automation, which the order-scoped `/open` link can't
  serve. It is superseded for the order emails only; its now-slightly-stale name is
  filed as tech-debt (`[[durable-order-access-link-followups]]`).
