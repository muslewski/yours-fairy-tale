# Branded transactional emails + deliver from hello@ — design

> **Status:** approved 2026-06-04. Next: writing-plans → implementation plan.

**Goal:** Make every transactional email (1) actually deliver to customers from
`Yours Fairy Tale <hello@yoursfairytale.com>`, and (2) look like the brand — a
shared, email-safe branded template instead of raw HTML. Also wire the
magic-link sign-in email, which is currently not sent at all.

**Why:** The Resend domain is now verified (DNS added + DKIM resolves). Emails
should come from our own domain and carry the brand. The magic-link email only
`console.log`s today, so customers cannot sign in to `/app` in production.

---

## Decisions (from brainstorming)

- Sender: `Yours Fairy Tale <hello@yoursfairytale.com>` for all customer email.
- Flip the production env now: `RESEND_FROM` set, `RESEND_TO_OVERRIDE` removed.
- Brand-voice applies to all copy (American English, sentence case, no em-dashes,
  calm, no hype — including no "AI-powered!").

---

## 1. Shared branded template — `lib/email-template.ts`

`renderBrandedEmail(opts): string` returns a complete email-safe HTML document.

```ts
interface BrandedEmailOptions {
  preheader: string;       // hidden inbox-preview snippet
  heading: string;         // the big title
  bodyHtml: string;        // pre-escaped/trusted inner HTML (paragraphs)
  accent?: "yellow" | "pink" | "blue"; // header/CTA accent; default "yellow"
  cta?: { label: string; href: string };
  footerNote?: string;     // optional small line above the standard footer
}
```

Email-safe constraints (hard requirements):
- Table-based layout, 600px max width, centered; all styling **inline**.
- Brand colors as hex literals (email clients have no CSS vars): deep `#1a1033`,
  cream `#fff9ee`, yellow `#faca23`, pink `#f042d2`, blue `#17c7e2`, white.
- Structure: cream page background → **deep-ink header band** with the logo
  (`https://yoursfairytale.com/logo.png`, absolute URL, ~40px) + "Yours Fairy
  Tale" wordmark → **white content card** with a 3px solid `#1a1033` border, a
  thin accent-colored top bar, rounded corners (where supported), and a soft
  offset shadow as progressive enhancement → heading → bodyHtml → optional
  **bulletproof button** (table-cell padded `<a>`, accent bg, deep border, white
  or deep text for contrast) → footer (tagline "a keepsake they'll ask for again
  and again", a line pointing to `hello@yoursfairytale.com`, small print).
- Hidden preheader span at the very top (`display:none;max-height:0;overflow:hidden`).
- Font: friendly stack `"Trebuchet MS", Verdana, -apple-system, sans-serif`;
  optionally `@import` Fredoka/Quicksand in `<head>` as progressive enhancement
  with solid fallbacks. Headlines bold.
- All caller-supplied dynamic strings used as TEXT must be HTML-escaped by the
  caller or via a shared `escapeHtml` (reuse `lib/utils.ts`). `bodyHtml` is
  trusted markup the callers assemble from escaped pieces.
- Accent → color map kept in the module.

This is the ONLY place email chrome lives. Every email below renders through it.

## 2. `sendEmail` — add replyTo

`lib/email.ts`: add optional `replyTo?: string` to `SendEmailOptions`, pass to
Resend as `replyTo` (or `reply_to`, per SDK). Keep the existing
`RESEND_TO_OVERRIDE` redirect + subject prefix behavior (still useful in
preview/dev). `from` continues to read `RESEND_FROM` (default unchanged in code;
the env provides the real value).

## 3. Re-skin the four emails through the template

- **Magic-link sign-in** (`lib/auth.ts` `sendMagicLink`): NEW — actually send.
  - accent `blue`, heading "Your sign-in link", body explaining it was requested
    for `/app`, CTA "Sign in" → `url`, a line that it expires shortly and to
    ignore if they did not request it.
  - Keep the dev `console.log(url)` and the `PLAYWRIGHT_TEST` file-sink exactly as
    they are (so e2e still reads the link). Wrap the real send in try/catch so an
    email failure never breaks the auth flow; if `RESEND_API_KEY` is unset,
    `sendEmail` already no-ops (dev).
  - `to: email`, subject "Your Yours Fairy Tale sign-in link".
- **Order confirmation** (`app/api/stripe/webhook/route.ts`
  `buildOrderConfirmationEmail`): accent `yellow`, heading "Your order is
  confirmed", body (child-aware) about production + that we will email when the
  preview is ready, CTA "Follow your video" → `https://yoursfairytale.com/sign-in`.
- **Status: proof_ready** (`lib/order-status-email.ts`): accent `pink`, heading
  from `messageForStatus`, CTA "Watch your preview" → `/sign-in`.
- **Status: delivered**: accent `blue`, heading from `messageForStatus`, CTA
  "Watch now" → `/sign-in`.
  (Both status emails: replace the hand-rolled `buildStatusEmail` with
  `renderBrandedEmail`. Keep `escapeHtml` usage.)
- **Contact form** (`lib/contact.ts` `buildContactEmail`): render through the
  template (accent `yellow`), internal-facing layout (Topic / From / message).
  Set `replyTo` to the submitter's email in `submitContactMessage` so the team
  can reply directly to the parent.

## 4. Copy fix — `lib/order-stages.ts`

`messageForStatus("in_production")` body currently says "We are **hand-animating**
their story right now." Change to the AI-crafted framing, calm:
"We are putting their story together right now, scene by scene. This part takes a
little time, and it is worth it. We will email you the moment your preview is
ready." (No "hand-animating", no hype.) This string also shows on the dashboard
timeline, so it stays consistent with the `ai-crafted-not-hand-animated` decision.

## 5. Environment (Vercel, production)

- Set `RESEND_FROM` = `Yours Fairy Tale <hello@yoursfairytale.com>`.
- Remove `RESEND_TO_OVERRIDE` from production (so real recipients get mail).
- Leave dev/preview as-is (override still helpful there). Confirm DNS resolves
  (DKIM already does) before/at flip. Trigger a redeploy if needed so the new env
  is picked up.

## 6. Tests

- **New** `tests/email/template.test.ts`: `renderBrandedEmail` output contains the
  heading, the preheader, the CTA label + href when given, the footer tagline,
  and escapes a dangerous heading (`<script>` → escaped). Accent maps to the right
  hex.
- **New** magic-link send test (in `tests/auth/`): mock `@/lib/email` `sendEmail`;
  call the `sendMagicLink` path (export a small testable `buildMagicLinkEmail`
  from auth or test via the plugin option) and assert `sendEmail` called with
  `to=email` and the html containing the `url`. Keep it lightweight (no DB).
- **Update** existing email tests so they still pass with the wrapped template:
  `tests/stripe/webhook.test.ts`, `tests/stripe/refund-email.test.ts`,
  `tests/app/status-emails.test.ts`, `tests/contact/contact.test.ts`. Assertions
  on dynamic content (child name, headline, message, recipient, subject) must
  still hold; loosen only HTML-structure assertions if needed.
- E2E unaffected (the Playwright magic-link file-sink is retained).

## 7. Mind

- Update `map/zones/checkout.md` (order + status emails now branded, replyTo) and
  `map/zones/auth-gating.md` (magic-link now actually emails, branded). Re-stamp.
- New decision `map/decisions/branded-email-template.md`: one shared email-safe
  template; sender hello@; magic-link wired; accents per type.
- The "in_production" copy fix references `[[ai-crafted-not-hand-animated]]`.
- `npm run mind`.

## Verification

- `npx tsc --noEmit` 0 errors; `npm run build` succeeds.
- Unit: `npx vitest run tests/email tests/contact tests/stripe tests/app/status-emails.test.ts tests/auth` green.
- Render each template to an `.html` file and open in a browser (or screenshot) to
  confirm the branded look: header band + logo, bordered card, accent, button,
  footer. (verify skill — observe the actual rendered email.)
- Confirm prod env shows `RESEND_FROM=hello@…` and no `RESEND_TO_OVERRIDE`.

## Out of scope (YAGNI)

- Refund/dispute customer emails (events only flip status today).
- React Email / MJML dependency — hand-rolled email-safe HTML is enough; no new dep.
- Unsubscribe management (transactional mail).
- Localized emails.
