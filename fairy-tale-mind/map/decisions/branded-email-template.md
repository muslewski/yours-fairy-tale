---
type: decision
summary: "All transactional email renders through one shared, email-safe branded template (lib/email-template.ts): deep-ink header band + logo, bordered white card, per-type accent (yellow/pink/blue), bulletproof CTA button, brand footer. Sender is hello@yoursfairytale.com. The magic-link sign-in email now actually sends (it previously only console-logged). sendEmail gained replyTo. No new email dependency — hand-rolled email-safe HTML."
tags: [email, brand, infrastructure]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[checkout]]", "[[auth-gating]]", "[[design-system]]"]
sources: ["[[2026-06-04-branded-transactional-emails-design]]"]
decided: 2026-06-04
supersededBy: ""
---

## Context
Each transactional email (order confirmation, status updates, contact) hand-rolled
its own raw HTML, and the magic-link sign-in email was never sent at all (it only
`console.log`ged the link, so customers could not sign in in production). With the
Resend domain now verified, email should come from our own domain and carry the brand.

## Decision
- One source of email chrome: `lib/email-template.ts` → `renderBrandedEmail(opts)` +
  `emailParagraphs(lines)`. Email-safe: table layout, inline styles, hex literals (no
  CSS vars), hosted logo (`https://yoursfairytale.com/logo.png`), preheader, bulletproof
  button, friendly font stack. Per-type accent: yellow (order), pink (proof ready),
  blue (sign-in / delivered).
- All five emails render through it: magic-link, order confirmation, proof_ready,
  delivered, contact.
- The magic-link email now actually sends via Resend (try/catch so it never breaks the
  auth flow); the dev `console.log` and the `PLAYWRIGHT_TEST` file-sink are retained.
- `sendEmail` gained an optional `replyTo`; the contact email sets it to the parent's
  address so the team replies directly to them.
- Sender: `Yours Fairy Tale <hello@yoursfairytale.com>` via `RESEND_FROM` (production).
  `RESEND_TO_OVERRIDE` is not set in production, so real recipients receive mail; it
  stays available for dev/preview.
- No new dependency (no React Email / MJML) — hand-rolled HTML is enough.

## Consequences
- New email types should go through `renderBrandedEmail`, never hand-rolled HTML.
- `RESEND_FROM` only delivers while the Resend domain stays verified. Vercel masks the
  value on `env pull` (all sensitive vars read back empty), so confirm sender changes in
  the dashboard or via a real send, not via pull.
- Email-client quirks (Outlook box-shadow, web fonts) degrade gracefully to border +
  fallback font; the template avoids anything that breaks hard.
