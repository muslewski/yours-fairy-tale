/**
 * Series waitlist domain logic — validation, thank-you email, persistence.
 * Mirrors lib/contact.ts: pure pieces exported for unit tests, one submit
 * function composing them. Copy follows the brand-voice skill (calm, warm,
 * parent-facing, sentence case).
 */
import { sendEmail } from "@/lib/email";
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";
import { getPayloadClient } from "@/lib/payload";

export interface WaitlistInput {
  email?: string;
  /** Honeypot — must be empty. */
  company?: string;
}

export type WaitlistResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateWaitlistInput(
  input: WaitlistInput,
): { ok: true; email: string } | { ok: false; error: string } {
  // Honeypot: any value here means a bot filled the hidden field.
  if (input.company && input.company.trim() !== "") {
    return { ok: false, error: "We couldn't add you to the list just now." };
  }
  const email = (input.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "Please add a valid email address." };
  }
  return { ok: true, email };
}

export function buildWaitlistEmail(): string {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://www.yoursfairytale.com"
  ).replace(/\/$/, "");
  return renderBrandedEmail({
    preheader: "You're on the list for The Series.",
    heading: "You're on the list",
    accent: "pink",
    bodyHtml: emailParagraphs([
      "Thank you for your interest in The Series, an ongoing animated show with your child as the recurring hero.",
      "We are still crafting it. The moment it is ready, we will write to this address.",
      "Until then, every story starts with a single video, made just for them.",
    ]),
    cta: { label: "Create their video", href: `${baseUrl}/#build` },
  });
}

export async function submitWaitlistSignup(
  input: WaitlistInput,
): Promise<WaitlistResult> {
  const v = validateWaitlistInput(input);
  if (!v.ok) return v;

  const payload = await getPayloadClient();
  const existing = await payload.find({
    collection: "waitlist",
    where: { email: { equals: v.email } },
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs > 0) {
    // Already on the list: success, and no second email.
    return { ok: true };
  }

  await payload.create({
    collection: "waitlist",
    data: { email: v.email, source: "series" },
    overrideAccess: true,
  });

  // Thank-you email is non-fatal: the signup is saved either way.
  try {
    await sendEmail({
      to: v.email,
      subject: "You're on the list for The Series",
      html: buildWaitlistEmail(),
    });
  } catch (err) {
    console.error("[waitlist] thank-you email failed (signup saved):", err);
  }
  return { ok: true };
}
