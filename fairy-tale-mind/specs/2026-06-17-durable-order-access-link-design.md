---
type: spec
summary: "Order-status emails (preview ready / delivered / track-your-order) stop linking a single-use 7-day magic-link token behind a confirm interstitial. Instead each order carries a durable, REUSABLE access token (30 days, refreshed on every send). Clicking the email link hits a public /open/<token> route that re-mints a fresh internal magic-link verification and 302s through Better Auth's real verify endpoint — establishing a normal session instantly (no interstitial) and landing on the order. An expired/invalid token shows a calm 'this link expired after 30 days, sign in with your email' page."
status: draft
created: 2026-06-17
related: ["[[auth-gating]]", "[[checkout]]", "[[prod-better-auth-url-canonical]]"]
sources:
  - "lib/order-tracking-link.ts"
  - "lib/order-status-email.ts"
  - "lib/auth.ts"
  - "lib/auth-confirm-url.ts"
---

# Durable order-access link — design

**Goal:** A customer who receives a "your preview is ready" (or "delivered", or
"track your order") email can click the link and **instantly** see their order —
reliably, repeatedly, for 30 days — because receiving the email at their order
address already proves they own it. No "Confirm sign-in" step, no single-use
token that burns on the first click.

**Problem today:** the email link is a Better Auth magic-link token minted by
`createOrderTrackingLink` — **single-use** (burned on first verify) with a
**7-day TTL**, behind the `/sign-in/verify` confirm interstitial. So a second
click, a double-submit, or opening the email a few days later yields "this link
has expired or was already used." A link whose job is "watch your preview"
shouldn't be a one-shot.

**Decisions (from the brand owner, 2026-06-17):**
- **Full sign-in**, reusable: clicking creates a normal customer session.
- **30 days** from send (refreshed each send), then it expires.
- **Instant** — no confirm interstitial on these links.
- On expiry: a calm page — "this link expired after 30 days for safety; sign in
  with your email to keep watching."
- The regular **sign-in** page keeps its short, single-use magic links + the
  scanner-safe interstitial (unchanged).

**Accepted security trade-off (documented in the decision record):** a reusable
link sent by email grants a full session to anyone who holds the link (a
forwarded email, or a link-prefetcher) for up to 30 days. The blast radius is
the customer's own keepsake orders + profile — no payment or PII *editing* is
exposed beyond what the customer already sees. This is the same trust model as
any magic link (possession of the email == identity), widened to "reusable for
30 days" deliberately for preview convenience.

---

## 1. The durable token (data)

Add to `collections/Orders.ts` (admin read-only, like `inStudioSince`):
- `accessToken` — text, a 32-char `[a-zA-Z]` random (same alphabet/shape as
  `randomToken()` in `lib/order-tracking-link.ts`). Unguessable; indexed for
  lookup.
- `accessTokenExpiresAt` — date.

Migration `migrations/<date>_orders_access_token.ts` (additive, idempotent,
mirrors `20260616_000001_order_in_studio_since`): add `access_token text` +
`access_token_expires_at timestamp(3) with time zone`, plus
`CREATE INDEX IF NOT EXISTS orders_access_token_idx ON orders (access_token)`.

A pure helper `lib/order-access-token.ts`:
- `newAccessToken(): string` — 32 chars `[a-zA-Z]` (reuse the existing token
  shape; extract/share the generator so it isn't duplicated).
- `ACCESS_TOKEN_TTL_DAYS = 30` and `accessTokenExpiresAt(now: Date): string`.
- `isAccessTokenLive(expiresAt: string | null, now: Date): boolean`.
Pure, unit-tested (no DB).

`ensureOrderAccessToken(orderId)` (DB core, in `lib/order-action-cores.ts` or a
new `lib/order-access.ts`): load the order; if it has no `accessToken`, mint one;
**always** refresh `accessTokenExpiresAt = now + 30d`; persist; return the token.
Called right before each status email is sent, so the most recent email's link
is always good for a fresh 30 days.

## 2. The public open route

`app/(site)/open/[token]/route.ts` — a **public** GET route handler (route
handlers don't inherit the (app) gate; this one must work for a signed-OUT
visitor):

1. Look up the order by `accessToken === params.token` (overrideAccess). If none,
   or `!isAccessTokenLive(accessTokenExpiresAt, now)` → 302 to the expired page
   (§4). Constant-shape response so a bad token can't enumerate orders.
2. Resolve the owner's email (`order.owner` → `users.email`).
3. **Re-mint a fresh, short-lived internal magic-link verification** for that
   email (the exact `verifications` shape `createOrderTrackingLink` already uses:
   identifier = a new random token, value = `JSON.stringify({ email })`,
   `expiresAt = now + 10 min`).
4. 302 to `/api/auth/magic-link/verify?token=<ephemeral>&callbackURL=/app/orders/<orderId>`
   — Better Auth consumes the ephemeral token, sets the session cookie, and 302s
   to the order. **No interstitial** (we minted the token for this exact request,
   so there's no scanner-burn concern — the email carries the *durable* token,
   not the ephemeral one).

The durable token is never consumed, so the email link works repeatedly until
`accessTokenExpiresAt`. Each visit re-mints a throwaway internal token.

**Why this mechanism:** it reuses Better Auth's real verify→session flow
verbatim — the same path `createOrderTrackingLink` uses and that
`tests/auth/order-tracking-link.test.ts` already drives end-to-end — so we do not
hand-roll session creation. `disableSignUp: true` is fine: the order owner is an
existing (webhook-created) user, so verify signs them in rather than rejecting.

## 3. Status + confirmation emails switch to the durable link

- `lib/order-status-email.ts`: replace the `createOrderTrackingLink(...)` call
  with `ensureOrderAccessToken(orderId)` → build `${baseUrl}/open/${token}`. The
  "Watch your preview" / "Watch now" CTA points there. (callbackURL is implicit:
  the route always lands on that order.)
- `app/api/stripe/webhook/route.ts` (the order-confirmation "track your order"
  link): same swap — `ensureOrderAccessToken` → `/open/<token>`. Same class of
  problem, same fix, kept consistent.
- `lib/order-tracking-link.ts` becomes unused by the order emails. Keep it ONLY
  if something else needs it; otherwise remove it and its test (it is superseded
  by the durable link). Decide during planning by grepping its callers.

## 4. The expired page (calm, on-brand)

`app/(site)/open/expired/page.tsx` (public). Copy via the brand-voice guide,
e.g.: headline "This link has expired", body "For your security, preview links
work for 30 days. Sign in with the email you used for your order and we'll take
you right back to it." CTA "Sign in" → `/sign-in`. Mirrors the existing
`/sign-in/verify/error` styling. (No order id is leaked in the URL — the route
just redirects here on any bad/expired token.)

## 5. Reduced blast radius / hygiene

- The internal ephemeral verifications are short-lived (10 min) and single-use;
  the existing flow already tolerates leftover `verifications` rows.
- `accessToken` is admin-read-only and never shown in the customer UI; it lives
  only in the emailed URL.
- A future "regenerate access link" studio action could rotate `accessToken` to
  revoke a leaked link — noted as out of scope here (filed as tech-debt).

## 6. Testing

- `tests/lib/order-access-token.test.ts` (pure, TDD): token shape; `isAccessTokenLive`
  at/around expiry; `accessTokenExpiresAt` math.
- `tests/auth/order-access-link.test.ts` (DB-backed): `ensureOrderAccessToken`
  mints once and refreshes expiry on re-call (token stable, expiry advances);
  and — mirroring `order-tracking-link.test.ts` — that an `/open/<token>`-minted
  ephemeral verification is consumable by Better Auth's real verify endpoint and
  yields a session. Plus: an expired/Unknown durable token resolves to the
  expired path (no session, no order leak).
- Webhook test: the confirmation email link is now `/open/<token>` and the order
  carries an `accessToken`.

## 7. Mind maintenance

- New decision record `map/decisions/2026-06-17-durable-order-access-link.md`:
  the reusable-30-day-session trade-off, why we re-mint through BA verify instead
  of rolling our own session, and that it supersedes the single-use tracking link
  for order emails (the sign-in magic link is unchanged).
- Re-stamp `auth-gating` (and `checkout` if the webhook link moves) to HEAD; add
  the new files to the owning zone globs; `npm run mind`.

## 8. Out of scope

- No change to the interactive **sign-in** magic link (short, single-use,
  interstitial-protected — correct as is).
- No "revoke/regenerate link" UI (tech-debt note).
- No change to what the order page itself renders.
