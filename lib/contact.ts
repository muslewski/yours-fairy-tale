/**
 * Contact form domain logic — pure validation + email construction + send.
 *
 * The /contact form POSTs here via app/api/contact/route.ts. We keep all rules
 * and the email template in this module so they are unit-testable without HTTP.
 *
 * Anti-spam: a hidden honeypot field `company` must stay empty. Real users
 * never see it; bots that fill every field trip it and are rejected.
 */
import { escapeHtml } from "@/lib/utils";
import { sendEmail } from "@/lib/email";

export const CONTACT_TOPICS = [
  "Order help",
  "Changes & revisions",
  "Delivery",
  "Gifting",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export interface ContactInput {
  name?: string;
  email?: string;
  topic?: string;
  message?: string;
  /** Honeypot — must be empty. */
  company?: string;
}

export interface ContactValue {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}

export type ValidationResult =
  | { ok: true; value: ContactValue }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_MESSAGE = 5000;

export function validateContactInput(input: ContactInput): ValidationResult {
  // Honeypot: any value here means a bot filled the hidden field.
  if (input.company && input.company.trim() !== "") {
    return { ok: false, error: "Your message could not be sent." };
  }

  const name = (input.name ?? "").trim();
  const email = (input.email ?? "").trim();
  const message = (input.message ?? "").trim();

  if (!name) return { ok: false, error: "Please add your name." };
  if (name.length > MAX_NAME) return { ok: false, error: "That name is too long." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please add a valid email address." };
  if (!message) return { ok: false, error: "Please add a message." };
  if (message.length > MAX_MESSAGE) return { ok: false, error: "That message is too long." };

  const topic = (CONTACT_TOPICS as readonly string[]).includes(input.topic ?? "")
    ? (input.topic as ContactTopic)
    : "Something else";

  return { ok: true, value: { name, email, topic, message } };
}

export function buildContactEmail(value: ContactValue): string {
  const safeName = escapeHtml(value.name);
  const safeEmail = escapeHtml(value.email);
  const safeTopic = escapeHtml(value.topic);
  // `white-space: pre-wrap` on the <p> below preserves the newlines, so we must
  // NOT also convert them to <br /> — that would double the line breaks.
  const safeMessage = escapeHtml(value.message);

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>New contact message</title></head>
<body style="font-family: sans-serif; color: #1a1033; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <h1 style="font-size: 20px; margin-bottom: 8px;">New contact message</h1>
  <p style="margin: 4px 0;"><strong>Topic:</strong> ${safeTopic}</p>
  <p style="margin: 4px 0;"><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
  <p style="white-space: pre-wrap; line-height: 1.5;">${safeMessage}</p>
  <p style="margin-top: 24px; font-size: 13px; color: #888;">
    Reply directly to ${safeEmail} to respond.
  </p>
</body>
</html>
  `.trim();
}

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitContactMessage(input: ContactInput): Promise<SubmitResult> {
  const result = validateContactInput(input);
  if (!result.ok) return result;

  const inbox = process.env.CONTACT_INBOX ?? "hello@yoursfairytale.com";
  await sendEmail({
    to: inbox,
    subject: `New contact message — ${result.value.topic}`,
    html: buildContactEmail(result.value),
  });
  return { ok: true };
}
