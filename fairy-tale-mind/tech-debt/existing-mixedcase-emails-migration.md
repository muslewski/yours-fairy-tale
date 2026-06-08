---
type: debt
summary: "Existing user rows with a mixed-case email (created before the lowercase fix) can't sign in. A one-time UPDATE users SET email = lower(email) is needed. Low priority: the field hook fixes all new accounts and no known mixed-case account exists."
tags: [auth, data-migration]
status: open
created: 2026-06-04
severity: low
related: ["[[email-lowercase-and-order-tracking-link]]", "[[auth-gating]]"]
---

## What
`collections/auth/Users.ts` now lowercases `email` on write, so all NEW accounts
are stored lowercase and align with Better Auth's lowercased lookup. But any rows
created BEFORE this fix with a mixed-case email (e.g. accounts created by the
webhook replays before the fix deployed) would still fail sign-in
(`new_user_signup_disabled`).

## Fix
One-time, idempotent, against the prod (Neon `main`) DB:

```sql
UPDATE users SET email = lower(email) WHERE email <> lower(email);
```

Watch for a unique-constraint collision (two rows `foo@` and `Foo@`) — unlikely in
the current dataset; resolve manually if it occurs.

## Why deferred
- The hook covers every future account.
- The known tester's email is already lowercase, so they are unaffected.
- Applying it needs an authorized prod DB write (the auto-mode classifier blocks
  unprompted prod queries), so it should be run deliberately with the owner.
