---
type: decision
summary: "The Series waitlist became real: signups persist to a Payload `waitlist` collection (adminOnly, unique lowercased email) via POST /api/waitlist, with a NON-FATAL Resend thank-you. Duplicates AND the lost concurrent-creation race both return quiet success — no enumeration, no double email."
tags: [series, waitlist, payload, email]
status: active
created: 2026-06-10
updated: 2026-06-10
related: ["[[series]]", "[[payload-backend]]", "[[contact-page]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
decided: 2026-06-10
supersededBy: ""
---

## Context
The `/series` waitlist form was a client-side fake: it always showed "success" and
stored nothing. Launching soon with real Stripe means real interest signals matter —
the owner decided (2026-06-10) the waitlist must persist signups and send a thank-you.
Where should the emails live, and how should duplicates behave?

## Decision
- **Storage: a Payload collection** (`collections/Waitlist.ts`), not a third-party
  list or a bare table. Rows are queryable in `/admin` (Commerce group, titled by
  email) with the same all-`adminOnly` access posture as Orders; the public
  REST/GraphQL surface never exposes it. Rows are created ONLY by
  `app/api/waitlist/route.ts` via the Local API with `overrideAccess`.
- **Pipeline mirrors the contact form's** form → route → lib triad: pure validation
  in `lib/waitlist.ts` (honeypot `company` field, trim/lowercase, 254-char cap,
  regex), thin route, `"use client"` form with pending/error/thank-you states.
- **Email is unique + lowercased** (same `beforeValidate` canonicalization as
  `users.email`), enforced by a unique index + the `20260610_000000_waitlist`
  migration.
- **Thank-you email is non-fatal**: "You're on the list for The Series" via Resend;
  a send failure is logged and the signup still succeeds — persistence is the
  critical path, the email is a courtesy.
- **Duplicate signup AND the lost creation race are both a QUIET success**: an
  existing row short-circuits to `{ ok: true }`, and a unique-violation
  `ValidationError` from a concurrent first-time signup is also treated as success
  (the winning request sends the one thank-you).

## Why
- Payload keeps the data in the studio's one admin surface — no new vendor, no
  export step, and the access-control posture is already proven on Orders.
- Quiet success on duplicates prevents **email enumeration** (the form never reveals
  whether an address is already on the list) and prevents **double thank-yous**.
- Treating the unique-index race as success makes the endpoint idempotent under
  double-submits and concurrent requests without locks.
- Non-fatal email matches the established invariant style: confirmation/status
  emails never block the critical write (see `[[checkout]]`).

## Consequences
- The waitlist is a real collection → it needed a committed migration (and got one);
  future schema tweaks follow migrate-on-deploy.
- Signups are visible/exportable in `/admin`; no campaign tooling yet — sending an
  actual launch announcement will need a Resend broadcast or similar later.
- Covered by `tests/waitlist/*` (validation, persistence, race, non-fatal email) and
  `e2e/waitlist.spec.ts`.
