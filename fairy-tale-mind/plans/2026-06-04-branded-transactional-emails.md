# Branded transactional emails + deliver from hello@ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`. All copy follows the brand-voice skill (American English, sentence case, NO em-dashes, calm, no hype).

**Goal:** One shared email-safe branded template; re-skin all transactional emails through it; wire the magic-link email (currently not sent); add replyTo; flip prod env to send from `Yours Fairy Tale <hello@yoursfairytale.com>`.

**Spec:** `fairy-tale-mind/specs/2026-06-04-branded-transactional-emails-design.md`

**Resend SDK:** v6 — reply-to field is `replyTo` (camelCase).

---

### Task 1: Shared branded template `lib/email-template.ts` (TDD)

**Files:** Create `lib/email-template.ts`, `tests/email/template.test.ts`.

- [ ] **Step 1: Write `tests/email/template.test.ts`**

```ts
import { expect, test } from "vitest";
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";

test("renders heading, preheader, footer tagline", () => {
  const html = renderBrandedEmail({
    preheader: "Peek me in the inbox",
    heading: "Your order is confirmed",
    bodyHtml: emailParagraphs(["Thank you for your order."]),
  });
  expect(html).toContain("Your order is confirmed");
  expect(html).toContain("Peek me in the inbox");
  expect(html).toContain("A keepsake they will ask for again and again.");
  expect(html).toContain("hello@yoursfairytale.com");
});

test("renders a CTA button with label + href", () => {
  const html = renderBrandedEmail({
    preheader: "p", heading: "h", bodyHtml: "<p>x</p>",
    cta: { label: "Sign in", href: "https://yoursfairytale.com/sign-in" },
  });
  expect(html).toContain("Sign in");
  expect(html).toContain('href="https://yoursfairytale.com/sign-in"');
});

test("escapes dangerous heading text", () => {
  const html = renderBrandedEmail({
    preheader: "p", heading: "<script>alert(1)</script>", bodyHtml: "<p>x</p>",
  });
  expect(html).not.toContain("<script>alert(1)</script>");
  expect(html).toContain("&lt;script&gt;");
});

test("accent maps to brand hex (pink)", () => {
  const html = renderBrandedEmail({ preheader: "p", heading: "h", bodyHtml: "<p>x</p>", accent: "pink" });
  expect(html).toContain("#f042d2");
});

test("emailParagraphs escapes and wraps each line", () => {
  const out = emailParagraphs(["a & b", "second"]);
  expect(out).toContain("a &amp; b");
  expect(out.match(/<p /g)?.length).toBe(2);
});
```

- [ ] **Step 2: Run `npx vitest run tests/email/template.test.ts` → FAIL (no module).**

- [ ] **Step 3: Implement `lib/email-template.ts`**

```ts
/**
 * The single source of email chrome. Every transactional email renders through
 * renderBrandedEmail so they all carry the brand and stay email-client safe
 * (table layout, inline styles, hosted logo, hex literals — no CSS vars).
 */
import { escapeHtml } from "@/lib/utils";

export type EmailAccent = "yellow" | "pink" | "blue";

const DEEP = "#1a1033";
const CREAM = "#fff9ee";
const LOGO_URL = "https://yoursfairytale.com/logo.png";
const FONT = "'Trebuchet MS', Verdana, -apple-system, sans-serif";

const ACCENT_HEX: Record<EmailAccent, string> = {
  yellow: "#faca23",
  pink: "#f042d2",
  blue: "#17c7e2",
};
// Text color with adequate contrast on each accent button background.
const ACCENT_TEXT: Record<EmailAccent, string> = {
  yellow: DEEP,
  pink: "#ffffff",
  blue: DEEP,
};

export interface BrandedEmailOptions {
  preheader: string;
  heading: string;
  bodyHtml: string; // trusted markup assembled from escaped pieces (use emailParagraphs)
  accent?: EmailAccent;
  cta?: { label: string; href: string };
  footerNote?: string;
}

/** Escape each line and wrap as a paragraph. Use for plain-text email bodies. */
export function emailParagraphs(lines: string[]): string {
  return lines
    .map(
      (l) =>
        `<p style="margin: 0 0 16px;">${escapeHtml(l)}</p>`,
    )
    .join("\n");
}

export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const accent = opts.accent ?? "yellow";
  const accentHex = ACCENT_HEX[accent];
  const btnText = ACCENT_TEXT[accent];

  const button = opts.cta
    ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 4px;">
                <tr>
                  <td align="center" bgcolor="${accentHex}" style="border-radius: 12px; border: 3px solid ${DEEP};">
                    <a href="${opts.cta.href}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: ${FONT}; font-size: 16px; font-weight: bold; color: ${btnText}; text-decoration: none;">${escapeHtml(opts.cta.label)}</a>
                  </td>
                </tr>
              </table>`
    : "";

  const footerNote = opts.footerNote
    ? `<p style="margin: 0 0 12px; font-family: ${FONT}; font-size: 14px; line-height: 1.5; color: ${DEEP};">${escapeHtml(opts.footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${CREAM};">
  <span style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; max-height:0; max-width:0; overflow:hidden;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${CREAM};">
    <tr>
      <td align="center" style="padding: 28px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px;">
          <tr>
            <td align="center" bgcolor="${DEEP}" style="border-radius: 16px 16px 0 0; padding: 22px;">
              <img src="${LOGO_URL}" width="36" height="36" alt="Yours Fairy Tale" style="vertical-align: middle; border: 0; display: inline-block;" />
              <span style="font-family: ${FONT}; font-size: 18px; font-weight: bold; color: #ffffff; vertical-align: middle; padding-left: 10px;">Yours Fairy Tale</span>
            </td>
          </tr>
          <tr><td bgcolor="${accentHex}" style="height: 6px; line-height: 6px; font-size: 0;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#ffffff" style="border-left: 3px solid ${DEEP}; border-right: 3px solid ${DEEP}; border-bottom: 3px solid ${DEEP}; border-radius: 0 0 16px 16px; padding: 36px 32px;">
              <h1 style="margin: 0 0 16px; font-family: ${FONT}; font-size: 26px; line-height: 1.15; color: ${DEEP};">${escapeHtml(opts.heading)}</h1>
              <div style="font-family: ${FONT}; font-size: 16px; line-height: 1.6; color: ${DEEP};">
                ${opts.bodyHtml}
              </div>
              ${button}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 24px 8px;">
              ${footerNote}
              <p style="margin: 0 0 6px; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${DEEP};">A keepsake they will ask for again and again.</p>
              <p style="margin: 0; font-family: ${FONT}; font-size: 13px; line-height: 1.5; color: ${DEEP};">Questions? Just reply, or write to <a href="mailto:hello@yoursfairytale.com" style="color: ${DEEP};">hello@yoursfairytale.com</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
```

- [ ] **Step 4:** `npx vitest run tests/email/template.test.ts` → 5 pass. `npx tsc --noEmit` → 0.
- [ ] **Step 5: Commit** `feat(email): shared branded email-safe template`.

---

### Task 2: `sendEmail` replyTo + re-skin contact email

**Files:** `lib/email.ts`, `lib/contact.ts`, `tests/contact/contact.test.ts`.

- [ ] **Step 1: `lib/email.ts`** — add `replyTo`:
  - Add `replyTo?: string;` to `SendEmailOptions`.
  - In the `resend.emails.send({...})` call, add `...(replyTo ? { replyTo } : {})`. Destructure `replyTo` from options. Keep `RESEND_TO_OVERRIDE` + subject-prefix behavior and the `from` default unchanged.

- [ ] **Step 2: `lib/contact.ts`** — render `buildContactEmail` through the template:
  - Import `renderBrandedEmail` (and keep `escapeHtml` where needed).
  - Rewrite `buildContactEmail(value)` to build `bodyHtml` from escaped fields (Topic, From name + email, the message with newlines → `<br />`) and return `renderBrandedEmail({ preheader: "New contact message", heading: "New contact message", accent: "yellow", bodyHtml, footerNote: \`Reply to ${value.email} to respond.\` })`. The message body may contain `<br />`, so build it as trusted HTML from escaped text (escape first, then replace `\n`).
  - In `submitContactMessage`, pass `replyTo: result.value.email` to `sendEmail`.
  - Keep the subject `New contact message — ${topic}` and inbox logic.

- [ ] **Step 3: `tests/contact/contact.test.ts`** — the `buildContactEmail contains the submitted fields` test should still pass (name/email/topic/message still present). Add an assertion that `submitContactMessage` calls `sendEmail` with `replyTo` equal to the input email (extend the existing "sends to the inbox" test to check `arg.replyTo`).

- [ ] **Step 4:** `npx vitest run tests/contact tests/email` → green. `tsc` → 0.
- [ ] **Step 5: Commit** `feat(email): replyTo support + branded contact email`.

---

### Task 3: Order confirmation email via template

**Files:** `app/api/stripe/webhook/route.ts`, `tests/stripe/webhook.test.ts`, `tests/stripe/refund-email.test.ts`.

- [ ] **Step 1:** Rewrite `buildOrderConfirmationEmail({ email, childName })` to use `renderBrandedEmail`:
  - `accent: "yellow"`, `heading: "Your order is confirmed"`.
  - body via `emailParagraphs([...])`: a child-aware first line (`We have received your order and ${childName}'s video is now in production.` / generic when null), then "We will email you the moment your preview is ready.", then a line that they can follow along after signing in with this email.
  - `cta: { label: "Follow your video", href: "https://yoursfairytale.com/sign-in" }`.
  - `preheader: "Your order is confirmed."`
  - Keep `escapeHtml` for `childName` (or rely on `emailParagraphs`, which escapes).
  - Keep the existing `subject` and `sendEmail` call site unchanged (still `to: email`).

- [ ] **Step 2:** Run `npx vitest run tests/stripe` → green. If `webhook.test.ts`/`refund-email.test.ts` assert on old raw HTML substrings, update those assertions to the new content (child name + "in production" + recipient must still hold). Do NOT change webhook behavior, only the email HTML.
- [ ] **Step 3:** `tsc` → 0. **Commit** `feat(email): branded order confirmation`.

---

### Task 4: Status emails via template + copy fix

**Files:** `lib/order-status-email.ts`, `lib/order-stages.ts`, `tests/app/status-emails.test.ts`.

- [ ] **Step 1: `lib/order-status-email.ts`** — replace `buildStatusEmail` with `renderBrandedEmail`:
  - In `sendStatusTransitionEmail`, choose accent + CTA by status: `proof_ready` → accent `pink`, CTA `{ label: "Watch your preview", href: "https://yoursfairytale.com/sign-in" }`; `delivered` → accent `blue`, CTA `{ label: "Watch now", href: "https://yoursfairytale.com/sign-in" }`.
  - `heading: headline`, body via `emailParagraphs([body])`, `preheader: headline`.
  - Remove the now-unused local `buildStatusEmail` + `escapeHtml` (template handles escaping) — or keep `escapeHtml` only if still referenced.
  - Keep the try/catch swallow + `to: ownerEmail`, `subject: headline`.

- [ ] **Step 2: `lib/order-stages.ts`** — fix `messageForStatus("in_production")` body:
  - FIND the body `We are hand-animating ${possessive} story right now. This part takes a little time, and it is worth it. We will email you the moment your preview is ready.`
  - REPLACE with `We are putting ${possessive} story together right now, scene by scene. This part takes a little time, and it is worth it. We will email you the moment your preview is ready.`

- [ ] **Step 3:** `npx vitest run tests/app/status-emails.test.ts` → green (update HTML-structure assertions if any; headline/body/recipient must still hold). `tsc` → 0.
- [ ] **Step 4: Commit** `feat(email): branded status emails; drop hand-animating copy`.

---

### Task 5: Wire the magic-link sign-in email

**Files:** `lib/auth.ts`, `tests/auth/magic-link-email.test.ts` (new).

- [ ] **Step 1:** Add an exported, testable builder to `lib/auth.ts` (or a small `lib/auth-emails.ts` if cleaner):

```ts
export function buildMagicLinkEmail(url: string): string {
  return renderBrandedEmail({
    preheader: "Your sign-in link is inside.",
    heading: "Your sign-in link",
    accent: "blue",
    bodyHtml: emailParagraphs([
      "Here is your secure link to sign in and follow your videos.",
      "This link expires shortly, so use it soon. If you did not request it, you can ignore this email.",
    ]),
    cta: { label: "Sign in", href: url },
  });
}
```

- [ ] **Step 2:** In `sendMagicLink`, after the existing `console.log` and the `PLAYWRIGHT_TEST` file-sink (KEEP BOTH), send the email:

```ts
try {
  await sendEmail({
    to: email,
    subject: "Your Yours Fairy Tale sign-in link",
    html: buildMagicLinkEmail(url),
  });
} catch (err) {
  console.error("[auth] magic-link email failed:", err);
}
```
Import `sendEmail` from `@/lib/email` and `renderBrandedEmail`/`emailParagraphs` from `@/lib/email-template`. Update the stale comment that says it only console.logs / "FUTURE: Resend".

- [ ] **Step 3: `tests/auth/magic-link-email.test.ts`** (no DB):

```ts
import { expect, test } from "vitest";
import { buildMagicLinkEmail } from "@/lib/auth";

test("magic-link email contains the sign-in url and a CTA", () => {
  const url = "https://yoursfairytale.com/api/auth/magic-link/verify?token=abc";
  const html = buildMagicLinkEmail(url);
  expect(html).toContain(url);
  expect(html).toContain("Sign in");
  expect(html).toContain("Your sign-in link");
});
```

(If importing `@/lib/auth` pulls in heavy server deps under vitest, move `buildMagicLinkEmail` to `lib/auth-emails.ts` and import from there in both `auth.ts` and the test.)

- [ ] **Step 4:** `npx vitest run tests/auth/magic-link-email.test.ts` → green. `tsc` → 0. Confirm e2e magic-link file-sink code is unchanged.
- [ ] **Step 5: Commit** `feat(email): send branded magic-link sign-in email`.

---

### Task 6: Flip production env (Vercel)

- [ ] **Step 1:** Set the production sender:
```bash
printf 'Yours Fairy Tale <hello@yoursfairytale.com>' | vercel env add RESEND_FROM production
```
(If `RESEND_FROM` already exists in production, remove then re-add: `vercel env rm RESEND_FROM production -y` first.)

- [ ] **Step 2:** Remove the production override so real recipients get mail:
```bash
vercel env rm RESEND_TO_OVERRIDE production -y   # ignore "not found" if absent
```
Leave `RESEND_TO_OVERRIDE` in **development**/**preview** intact.

- [ ] **Step 3:** Confirm: `vercel env ls production | grep -iE "RESEND_FROM|RESEND_TO_OVERRIDE"` — FROM present, OVERRIDE absent. (Values are write-only/sensitive; presence is what we check.) The change takes effect on the next production deploy (the merge to main will redeploy).

> NOTE: requires the Resend domain to be Verified (DNS/DKIM already resolve). If a test send bounces, the domain is not yet verified in Resend — revert by re-adding `RESEND_TO_OVERRIDE` until it is.

---

### Task 7: Mind maintenance

**Files:** `map/zones/checkout.md`, `map/zones/auth-gating.md`, new `map/decisions/branded-email-template.md`, `npm run mind`.

- [ ] **Step 1:** `checkout.md` — note order confirmation + status emails now render through `lib/email-template.ts` and send from hello@ with replyTo; re-stamp `verifiedAt` to the latest HEAD.
- [ ] **Step 2:** `auth-gating.md` — note the magic-link now actually emails (branded), not just console.log; re-stamp.
- [ ] **Step 3:** New decision `branded-email-template.md`: one shared email-safe template, sender `hello@`, magic-link wired, per-type accents, no new email dependency (hand-rolled HTML). Reference the spec.
- [ ] **Step 4:** `npm run mind`. **Commit** `docs(mind): branded email system — zones + decision`.

---

### Task 8: Verification + finish

- [ ] **Step 1:** `npx tsc --noEmit` → 0. `npm run build` → succeeds.
- [ ] **Step 2:** Unit: `npx vitest run tests/email tests/contact tests/stripe tests/app/status-emails.test.ts tests/auth/magic-link-email.test.ts` → all green.
- [ ] **Step 3 (verify skill — observe the real rendered email):** write a tiny throwaway Node script that imports each builder (`renderBrandedEmail` sample, `buildMagicLinkEmail`, `buildOrderConfirmationEmail` if exported, status email, contact email) and writes `.html` files to `/tmp`, then open them in a browser (or screenshot) to confirm: header band + logo, bordered card, accent bar, bulletproof button, footer. Delete the throwaway script after. Capture a screenshot.
- [ ] **Step 4:** Confirm prod env (Task 6 Step 3 grep).
- [ ] **Step 5: Finish** (REQUIRED SUB-SKILL: superpowers:finishing-a-development-branch) — present merge/PR options.

---

## Self-review notes
- Template is the single chrome source; all 5 emails (magic-link, order, proof, delivered, contact) render through it. Spec sections all mapped.
- replyTo confirmed `replyTo` (Resend v6). Logo via absolute URL.
- Magic-link keeps `console.log` + Playwright file-sink → e2e unaffected; send wrapped in try/catch.
- Env flip is its own task; reversible (re-add override) if Resend not verified.
- Copy fix removes the last "hand-animating" string (dashboard + email), consistent with `[[ai-crafted-not-hand-animated]]`.
- No new dependency (no React Email/MJML).
