/** Branded HTML for the magic-link sign-in email. Kept separate from lib/auth.ts
 *  so it is unit-testable without booting the Better Auth server stack. */
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";

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
