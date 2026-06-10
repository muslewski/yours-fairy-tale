---
type: zone
summary: "The Series subpage and its REAL waitlist — signups persist to the Payload `waitlist` collection via /api/waitlist and get a non-fatal Resend thank-you."
tags: [surface, marketing, api]
status: active
created: 2026-06-02
updated: 2026-06-10
related: ["[[app-shell]]", "[[payload-backend]]", "[[contact]]"]
sources: ["[[waitlist-signups-payload-plus-resend]]"]
owns:
  routes: ["/series", "/api/waitlist"]
  anchors: ["route:/series", "id:waitlist"]
  globs:
    - "app/series/page.tsx"
    - "components/series/*"
    - "app/api/waitlist/route.ts"
    - "lib/waitlist.ts"
    - "tests/waitlist/*"
    - "e2e/waitlist.spec.ts"
depends: ["[[app-shell]]", "[[payload-backend]]"]
invariants:
  - rule: "The waitlist form never fakes success — every signup persists via POST /api/waitlist to the Payload `waitlist` collection before the form shows its thank-you state."
    enforcedBy: ["tests/waitlist/route.test.ts", "tests/waitlist/waitlist.test.ts", "e2e/waitlist.spec.ts"]
  - rule: "Validation lives ONLY in lib/waitlist.ts (pure, mirrors lib/contact.ts): hidden honeypot field (company) must stay empty; email is trimmed, lowercased, capped at 254 chars, and regex-checked."
    enforcedBy: ["tests/waitlist/waitlist.test.ts"]
  - rule: "A duplicate signup AND a lost concurrent-creation race (unique-index ValidationError) are both a QUIET success — no enumeration of who's on the list, no second thank-you email."
    enforcedBy: ["tests/waitlist/waitlist.test.ts"]
  - rule: "The Resend thank-you ('You're on the list for The Series') is non-fatal — the signup is saved even if the email send fails (logged, never rethrown)."
    enforcedBy: ["tests/waitlist/waitlist.test.ts"]
verifiedAt: 76b1727
---

## Purpose
The `/series` route showcases the upcoming series and captures early-access email
addresses via the waitlist form. Components live in `components/series/`; the
sub-layout in `app/series/layout.tsx` is owned by `[[app-shell]]`.

## Waitlist pipeline (real since 2026-06-10)
Mirrors the contact form's form → route → lib triad:
- `components/series/waitlist-form.tsx` (`"use client"`) — POSTs `{ email, company }`
  to `/api/waitlist`, with pending / gentle-error / thank-you states (brand voice).
- `app/api/waitlist/route.ts` — thin handler; delegates to `submitWaitlistSignup`.
- `lib/waitlist.ts` — pure validation (`validateWaitlistInput`), the branded
  thank-you email (`buildWaitlistEmail`), and `submitWaitlistSignup`, which checks
  for an existing row, creates via the Local API (`overrideAccess`), treats the
  unique-violation race as success, then sends the non-fatal thank-you.
- Storage: the `waitlist` collection (unique lowercased email) is owned by
  `[[payload-backend]]`, with its `20260610_000000_waitlist` migration.

## Anchors & layout
Section id: `waitlist` (the sign-up form section in `app/series/page.tsx`).

## Lineage
Seeded from the existing site at Mind setup.
The waitlist form was a client-side fake (always "success", nothing stored) until
the launch-hardening pass made it real — Payload persistence + Resend thank-you
(2026-06-10, see `[[waitlist-signups-payload-plus-resend]]`).
