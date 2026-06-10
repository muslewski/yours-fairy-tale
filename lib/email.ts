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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev convenience only. In production this is a hard error: silently
    // dropping mail would break magic-link sign-in (the only sign-in path)
    // and order confirmations with no visible symptom.
    if (process.env.NODE_ENV === "production") {
      throw new Error("[email] RESEND_API_KEY is not set in production.");
    }
    console.warn("[email] RESEND_API_KEY is not set — skipping email send (dev only).");
    return;
  }

  const override = process.env.RESEND_TO_OVERRIDE;
  const actualTo = override || to;
  const actualSubject = override ? `[→ ${to}] ${subject}` : subject;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: actualTo,
    subject: actualSubject,
    html,
    ...(replyTo ? { replyTo } : {}),
  });
}
