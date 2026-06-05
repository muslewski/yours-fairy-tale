---
type: debt
summary: "When a parent adds a note to the studio from their order page (addOrderNote → customerNotes), nothing notifies the studio — the note only appears in /admin if someone happens to look. No email / dashboard signal."
tags: [customer-area, notifications, email]
status: open
created: 2026-06-04
updated: 2026-06-04
related: ["[[auth-gating]]", "[[order-detail-subpage-and-notes]]"]
sources: []
severity: medium
effort: low
---

## Problem
The order detail page lets a parent append a free-text note to the studio
(`addOrderNote` → the Orders `customerNotes` array). The note is saved and shown
back to the parent, and the studio can read it inline in `/admin`. But there is
**no active notification**: the studio learns about a note only by opening the
order in `/admin`. A parent could add an important, time-sensitive detail ("please
fix the spelling of her name before you finish") that sits unseen.

## Fix
Notify the studio when a note lands. Options, cheapest first:
- Send an internal email to `hello@yoursfairytale.com` from `addOrderNote` using
  the existing branded email infra (`lib/email.ts` + `lib/email-template.ts`) —
  subject like "New note on {child}'s order", body = the note + a link to the
  order in `/admin`. Mirror the non-fatal error handling already used by the
  status-transition email hook.
- And/or surface an "unread customer note" flag/badge in the Orders admin list
  (e.g. a `lastCustomerNoteAt` field vs a studio-side `notesSeenAt`).

Keep it non-fatal: a notification failure must never break the parent's note
submission (the note is already persisted before any notify step).
