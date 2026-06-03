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
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is not set — skipping email send.");
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
  });
}
