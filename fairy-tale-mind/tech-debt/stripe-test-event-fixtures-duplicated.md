---
type: debt
summary: "tests/stripe/webhook.test.ts inlines Stripe event literals (refund/dispute shapes) that duplicate the event-builder helpers already living in tests/stripe/refund-email.test.ts — extract a shared fixture module."
tags: [testing, stripe]
status: open
created: 2026-06-10
updated: 2026-06-10
related: ["[[testing]]", "[[checkout]]"]
sources: []
severity: low
effort: low
---

## Problem
The launch-hardening orphan-event tests added to `tests/stripe/webhook.test.ts`
construct `charge.refunded` / `charge.dispute.created` event objects as inline
literals. `tests/stripe/refund-email.test.ts` already has helper builders for the
same event shapes. Two hand-maintained copies of the Stripe event structure will
drift — a shape change (new required field, renamed nesting) must now be fixed in
two files, and a mismatch could make one suite pass against a stale shape.

Flagged by the launch-hardening reviewer; deferred to keep that change-set focused.

## Fix
Extract the event builders into a shared fixture module (e.g.
`tests/stripe/fixtures.ts` — not `*.test.ts`, so vitest won't collect it) and import
it from both test files.
