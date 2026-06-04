# Contact page (`/contact`) — design

> **Status:** approved 2026-06-04. Next step: writing-plans → implementation plan.

**Goal:** Add a public `/contact` subpage where parents can reach a real person —
a functional contact form (delivered via Resend), direct channels, support
highlights, a contact-oriented mini-FAQ, and a "Place an order" CTA back to the
homepage wizard.

**Why:** The footer's **Support → "Contact us"** link is currently a dead
`/#top` anchor. The homepage FAQ answers *product* objections, but there is no
surface for "talk to a human." This page fills that gap and gives the footer
link a real home.

---

## Surfaces & routing

- New route group-free route `app/contact/`:
  - `layout.tsx` — mirrors `app/series/layout.tsx`: `<SiteNav/>` + cream `<main>`
    (`min-h-screen bg-brand-cream pb-24 pt-28 … sm:pt-32`) + `<SiteFooter/>`.
    The footer owns its cream→deep entry wave, so no per-section wave here.
  - `page.tsx` — a **server component** holding all static content, rendering a
    small `"use client"` island `<ContactForm/>` for the interactive form.
- Visual language: comic cards (deep-ink `border-[3px]`, `shadow-comic` /
  `shadow-comic-sm`), brand tokens only (no hardcoded hex), Fredoka for
  headlines / Quicksand for body — consistent with `/series` and `/sign-in`.

## Page sections (top → bottom)

1. **Intro** — warm, parent-facing headline + one supporting line. Brand-voice:
   calm, sincere, no hype/SFX. Conveys "a real person reads and replies."
2. **Split card** (echoes the sign-in split layout, `lg:grid-cols-2`):
   - **Left — contact form** (functional). Fields: Name, Email, **Topic**
     `<select>` (Order help · Changes & revisions · Delivery · Gifting ·
     Something else), Message `<textarea>`. States: idle → loading ("Sending…")
     → success (friendly confirmation card) / error (gentle on-brand message),
     modeled on the sign-in form. Includes a visually-hidden **honeypot** field
     (`company`) that must stay empty.
   - **Right — direct channels card**: `hello@yoursfairytale.com` (mailto link),
     response-time reassurance ("We reply within one business day."), and the
     existing social labels (Instagram · TikTok · Pinterest).
3. **Support highlights** — 4 small cards: Order help · Changes & revisions ·
   Delivery & formats · Gifting. Reassurance before reaching out.
4. **Mini-FAQ** — 3–4 contact-oriented Q&As (how soon you'll hear back, changing
   an order, refunds). Each section closes with a link to the full homepage FAQ
   (`/#faq`).
5. **"Place an order" CTA band** → `/#build` (the configurator wizard).

## Backend — functional form via Resend

- `lib/contact.ts` (pure, testable):
  - `ContactInput` type: `{ name, email, topic, message, company? }`.
  - `validateContactInput(input)` → `{ ok: true, value } | { ok: false, error }`.
    Rules: name non-empty (≤ 100 chars), email matches a basic email shape,
    message non-empty (≤ 5000 chars), topic is one of the allowed values
    (defaults to "Something else" if missing/unknown), **honeypot `company` must
    be empty** (non-empty → treated as spam, reject). Trims strings.
  - `buildContactEmail(input)` → HTML string, same inline-style template family
    as `buildOrderConfirmationEmail` in the Stripe webhook (sans-serif, brand
    ink `#1a1033`, 560px). Includes name, reply-to email, topic, message.
  - `submitContactMessage(input)` → validates, then `sendEmail({ to: inbox,
    subject, html })` where `inbox = process.env.CONTACT_INBOX ??
    "hello@yoursfairytale.com"`. Subject: `New contact message — {topic}`.
    Returns a result object; never throws on validation failure.
- `app/api/contact/route.ts` — `POST` handler: parse JSON body, call
  `submitContactMessage`, return `{ ok: true }` (200) or `{ ok: false, error }`
  (400) on validation failure; 500 on unexpected send error. No auth (public).
- Dev safety: `sendEmail` already redirects all mail to `RESEND_TO_OVERRIDE`
  when no domain is verified, so the contact form is safe to exercise in dev.

## Wiring

- `components/home/site-footer.tsx`: Support column **"Contact us"** `href`
  changes from `/#top` to `/contact`. (Other dead Support links —
  Delivery, Track your order — stay as-is; out of scope.)

## Testing (matches the `testing` zone conventions)

- **Unit** (`tests/contact/contact.test.ts`): `validateContactInput` happy path
  + each rejection (empty name, bad email, empty message, filled honeypot,
  unknown topic → defaulted); `buildContactEmail` contains the submitted fields.
- **Integration** (`tests/contact/route.test.ts`): mock `sendEmail`; POST valid
  body → 200 + `sendEmail` called with the inbox; POST invalid body → 400 +
  `sendEmail` NOT called; filled honeypot → 400 (or 200 silent-drop — pick 400
  for testability) + not sent.
- **E2E** (`e2e/contact.spec.ts`, Layer A): navigate `/contact`, fill the form,
  mock `**/api/contact` → success, assert the success state renders; assert the
  footer "Contact us" link resolves to `/contact`.

## Mind maintenance (on finish)

- New zone card `map/zones/contact.md` (owns `app/contact/**`, `lib/contact.ts`,
  `app/api/contact/route.ts`, `components/contact/**`), related to `app-shell`,
  `checkout` (shares `lib/email.ts`), `homepage`.
- Decision record `map/decisions/contact-page.md`: why the form is **functional
  via Resend** (Resend already wired; low effort; real value) while the footer
  newsletter / photo dropzone stay UI-only (those need infra we don't have yet).
- Re-stamp `app-shell` `verifiedAt` (footer link change) and run `npm run mind`.

## Out of scope (YAGNI)

- Rate-limiting / CAPTCHA (honeypot only for now).
- Persisting messages in Payload (email delivery is enough today).
- Live chat, phone number, nav-bar contact link.
- Fixing the other dead footer links (Delivery, Track your order, Company column).

## File structure

| File | Responsibility |
|---|---|
| `app/contact/layout.tsx` | Marketing chrome (nav + main + footer) |
| `app/contact/page.tsx` | Static page content (server component) |
| `components/contact/contact-form.tsx` | `"use client"` interactive form island |
| `lib/contact.ts` | Validation + email template + send (pure/testable) |
| `app/api/contact/route.ts` | Public POST endpoint |
| `components/home/site-footer.tsx` | (edit) "Contact us" → `/contact` |
| `tests/contact/contact.test.ts` | Unit tests for `lib/contact.ts` |
| `tests/contact/route.test.ts` | Integration test for the route |
| `e2e/contact.spec.ts` | Layer-A E2E |
