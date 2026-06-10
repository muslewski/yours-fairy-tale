---
type: decision
summary: "The /studio panel is gated by Payload's OWN admins auth (payload.auth via the Local API) — no new auth system, no roles. Customer Better Auth cookies resolve to null. The (gated) layout is only a navigation gate; every read and mutation re-guards itself, per Next's auth guide."
tags: [studio, auth, security]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[studio]]", "[[payload-backend]]", "[[auth-gating]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-studio-panel.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
The staff order panel at `/studio` needs a login. The repo already runs TWO auth
systems: Payload's native auth on the `admins` collection (the `/admin` panel —
the only `auth: true` collection) and Better Auth for customers (magic links,
plain collections, different cookie namespace). Options considered: a third auth
system, a `role` field on the customer `users` collection, or reusing one of the
two that exist.

## Decision
- **Reuse Payload's own admins auth.** `lib/studio-auth.ts` resolves the
  `payload-token` cookie via the Local API (`payload.auth({ headers })`) and
  accepts the user ONLY if `user.collection === "admins"` — the same account
  signs in to `/admin` and `/studio`. No new tables, no roles, no second staff
  credential to manage.
- **Customer sessions resolve to null by construction**: Better Auth cookies
  live in a different namespace, and the `collection !== "admins"` check guards
  config drift if another `auth: true` collection ever appears.
- **The `(gated)` layout is ONLY a navigation gate.** Next's authentication
  guide is explicit: layouts don't re-render on client-side transitions, so a
  layout check alone doesn't verify the session on every route change. So every
  studio read (`lib/studio-data.ts`) and every mutation (`lib/studio-actions.ts`)
  independently calls `getStudioUser`/`requireStudioUser`; the blob-upload token
  route checks inside `onBeforeGenerateToken` (route handlers don't inherit
  layouts at all). The data layer is the boundary; the layout is UX.

## Why
- The studio IS the `/admin` staff — same two people, same trust level. A
  separate auth system or a role matrix would be pure overhead at this scale.
- `payload.auth` is Payload's first-party doorway for exactly this: resolving
  the panel session from request headers in app code.
- Per-read/per-mutation guarding follows the same shape the customer area
  already proved (`assertOwnsOrder` at the top of every action).

## Consequences
- Staff onboarding/offboarding stays a single operation in the `admins`
  collection.
- There is no permission granularity inside the studio — any admin can do
  everything. Acceptable for a two-person studio; revisit if staff grows.
- `tests/studio/auth.test.ts` pins the bridge: a real admins token resolves, a
  customer/absent/foreign cookie resolves null, and `requireStudioUser` throws.
