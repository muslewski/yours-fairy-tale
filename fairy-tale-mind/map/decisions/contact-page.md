---
type: decision
summary: "The /contact form is FUNCTIONAL — it sends real email via Resend — while other marketing forms (footer newsletter, configurator photo dropzone) stay UI-only. Resend was already wired for order/status email, so delivering a contact message was low effort and high value. Spam defense is a hidden honeypot only; messages are emailed (CONTACT_INBOX, default hello@yoursfairytale.com), not persisted in Payload."
tags: [contact, email, support]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[contact]]", "[[checkout]]"]
sources: ["[[2026-06-04-contact-page-design]]"]
decided: 2026-06-04
supersededBy: ""
---

## Context
The footer newsletter and the configurator photo dropzone are wired in the UI with no
live backend, because they need infrastructure we don't have yet (a mailing-list
provider, Blob storage). The contact form is different: Resend is already wired
(`lib/email.ts`, used by the Stripe webhook order email and the status-transition
emails), so actually delivering a contact message is a small, self-contained addition
with real user value.

## Decision
Make the contact form actually send. Validation + email construction live in a pure,
unit-tested `lib/contact.ts`; the HTTP surface is a thin `POST /api/contact` that
delegates to `submitContactMessage`. Spam defense is a hidden honeypot field
(`company`) only — no CAPTCHA, no rate-limiting yet (YAGNI). Messages are emailed to
`CONTACT_INBOX` (default `hello@yoursfairytale.com`); they are not persisted in Payload.

## Consequences
- A real inbox must back `CONTACT_INBOX`. Until a sending domain is verified,
  `RESEND_TO_OVERRIDE` redirects all mail safely in dev (and the `[→ real]` subject
  prefix keeps it traceable).
- If spam becomes a problem, add rate-limiting / a challenge later — the honeypot is
  the only barrier today.
- No message history exists. If we later want one, add a Payload collection and write
  the message in `submitContactMessage` before/after the send. Deferred for now.
- The email HTML is hand-escaped via `escapeHtml` (added to `lib/utils.ts`); this is
  the project's first shared HTML-escape helper and could later harden
  `buildOrderConfirmationEmail` in the Stripe webhook, which still interpolates
  unescaped (low risk — those values are server-controlled).
