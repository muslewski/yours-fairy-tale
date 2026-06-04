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
import { renderBrandedEmail } from "@/lib/email-template";

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
  // `white-space: pre-wrap` on the message paragraph preserves newlines, so we
  // must NOT also convert them to <br /> — that would double the line breaks.
  const safeMessage = escapeHtml(value.message);

  const bodyHtml = [
    `<p style="margin: 0 0 12px;"><strong>Topic:</strong> ${safeTopic}</p>`,
    `<p style="margin: 0 0 12px;"><strong>From:</strong> ${safeName} (${safeEmail})</p>`,
    `<p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>`,
  ].join("\n");

  return renderBrandedEmail({
    preheader: `New contact message — ${value.topic}`,
    heading: "New contact message",
    accent: "yellow",
    bodyHtml,
    footerNote: `Reply to ${value.email} to respond.`,
  });
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
    replyTo: result.value.email,
  });
  return { ok: true };
}
