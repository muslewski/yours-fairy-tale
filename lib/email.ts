/**
 * Thin email helper using the Resend SDK.
 *
 * Dev routing rule: if RESEND_TO_OVERRIDE is set (no verified domain yet),
 * all mail is redirected to that address. The real recipient is prefixed to
 * the subject so dev mail is traceable: "[→ real@address.com] original subject".
 */
import { Resend } from "resend";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, replyTo }: SendEmailOptions): Promise<void> {
  // Real mail must go out in production — EXCEPT under Playwright e2e, which runs
  // a *production build* but delivers magic links through a file sink (lib/auth.ts)
  // and must not depend on Resend creds or send real mail to fake test addresses.
  // Boot validation (lib/required-env.ts) guarantees these keys in real prod, so
  // this backstop never fires there regardless of the e2e exemption.
  const mustSend =
    process.env.NODE_ENV === "production" && process.env.PLAYWRIGHT_TEST !== "1";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev/e2e convenience. In real production this is a hard error: silently
    // dropping mail would break magic-link sign-in (the only sign-in path)
    // and order confirmations with no visible symptom.
    if (mustSend) {
      throw new Error("[email] RESEND_API_KEY is not set in production.");
    }
    console.warn("[email] RESEND_API_KEY is not set — skipping email send (dev/e2e only).");
    return;
  }

  const override = process.env.RESEND_TO_OVERRIDE;
  const actualTo = override || to;
  const actualSubject = override ? `[→ ${to}] ${subject}` : subject;
  const from = process.env.RESEND_FROM;
  if (!from) {
    // Same contract as RESEND_API_KEY above: boot validation guarantees this in
    // production; the resend.dev sandbox sender is a dev-only convenience.
    if (mustSend) {
      throw new Error("[email] RESEND_FROM is not set in production.");
    }
    console.warn("[email] RESEND_FROM is not set — using the resend.dev sandbox sender (dev/e2e only).");
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: from ?? "onboarding@resend.dev",
    to: actualTo,
    subject: actualSubject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
}
