---
type: debt
summary: "Dev/test Postgres holds ~60+60 old orders rows with length='standard' / detailLevel='classic'; after the enum reconciliation, pushDevSchema can't recast the column and every DB-bound test fails at Payload init."
tags: [testing, database, checkout]
status: open
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[configurator]]", "[[payload-backend]]"]
sources: ["[[server-computed-checkout-price]]"]
severity: high
effort: low
---

## Problem
Task 3 reconciled the `orders` enums to the configurator vocabulary:
`length` → `[short, medium, long]` (was `[short, standard, long]`) and
`detailLevel` → `[basic, detailed, premium]` (was `[classic, detailed, premium]`).

The shared dev/test Postgres (`DATABASE_URI`) has accumulated **60 rows with
`length='standard'` and 60 with `detail_level='classic'`** from prior runs of
`tests/stripe/refund-email.test.ts` (which used to insert those literals on every run).

Because the enum type no longer lists `standard`/`classic`, Payload's dev-mode
`pushDevSchema` cannot recast the column (`... USING col::text::enum_orders_length`)
and throws `invalid input value for enum ...: "standard"` at `getPayloadClient()`
**init**. This fails EVERY test file that boots Payload (webhook, refund-email,
auth, payload, app/* — ~9 files), not just the changed ones.

Code is correct and verified independently:
- `npx tsc --noEmit` clean.
- `npm run build` succeeds.
- All network-free tests pass: `tests/lib/pricing.test.ts`, `tests/stripe/checkout.test.ts`,
  `tests/smoke.test.ts` (18 tests green).
- On a **clean** DB (and production Neon, which has no such rows) the new enum applies fine.

## Why it isn't fixed here
The fix is a one-time data remap of those rows
(`standard`→`medium`, `classic`→`basic`). Doing it required either a direct `UPDATE`
against the shared DB or reading the rows to confirm their origin — both were declined by
the environment's safety classifier as unauthorized mutation/PII reads of shared order
records. That guardrail is correct; the remap needs explicit human sign-off.

## Fix (pick one, then re-run `npx vitest run`)
1. **Remap the stale rows** (fastest):
   ```sql
   UPDATE orders SET length = 'medium' WHERE length::text = 'standard';
   UPDATE orders SET detail_level = 'basic' WHERE detail_level::text = 'classic';
   ```
   (Run against the dev DB only — production has no such rows.)
2. Or **reset the dev DB** if those rows are disposable test data.
3. Or add a Payload migration that performs the remap, and run `payload migrate`
   before the suite in CI.

Then the full suite should be green (the test seed data already uses the new
vocabulary after this change).
