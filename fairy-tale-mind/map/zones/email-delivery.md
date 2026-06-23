---
type: zone
summary: "Transactional email via Resend — order confirmation, magic-link sign-in, order status updates, series waitlist thank-you, and contact form relay. Templates live in lib/email-template.ts + lib/email.ts; auth emails wired through Better Auth in lib/auth-emails.ts."
tags: [email, resend, transactional, magic-link, confirmation]
status: seeded
created: 2026-06-23
updated: 2026-06-23
verifiedAt: unverified
owns:
  globs:
    - "lib/email*.ts"
    - "lib/order-status-email.ts"
depends:
  - "[[auth-gating]]"
  - "[[checkout]]"
  - "[[series]]"
---

## What this is

Email delivery uses Resend as the sole transport. All outbound mail paths are: order confirmation (fired from the Stripe webhook handler), Better Auth magic-link (lib/auth-emails.ts), order-status change notifications (lib/order-status-email.ts), contact form relay, and the series/footer waitlist thank-you. Templates are React/JSX rendered server-side via Resend's React email helper. Failures are logged but never crash the primary flow.

## Key files

- `lib/email.ts` — low-level Resend send wrapper
- `lib/email-template.ts` — shared React email template
- `lib/auth-emails.ts` — Better Auth magic-link email hook
- `lib/order-status-email.ts` — status-change email content + dispatch
- `lib/contact.ts` — contact form → Resend relay
