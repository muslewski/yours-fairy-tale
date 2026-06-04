/**
 * Status-transition email helper for the Orders collection.
 *
 * Called from the Orders afterChange hook when the studio advances production
 * to a milestone the customer is waiting for. Fires ONLY for:
 *
 *   - proof_ready  — "your preview is ready"
 *   - delivered    — "your video is ready to watch"
 *
 * All other status transitions are intentionally silent:
 *   - awaiting_assets / in_production / revisions / approved / refunded / cancelled
 *     are internal studio steps or customer-initiated transitions.
 *   - The creation (paid) email is handled by the Stripe webhook — never doubled here.
 *
 * Non-fatal: errors are logged and never re-thrown so an email failure can
 * never fail the underlying order update.
 */

import { sendEmail } from "@/lib/email";
import { renderBrandedEmail, emailParagraphs } from "@/lib/email-template";
import { messageForStatus, type OrderStatus } from "@/lib/order-stages";

/** Statuses that warrant a proactive "heads-up" email to the customer. */
const NOTIFYING_STATUSES = new Set<OrderStatus>(["proof_ready", "delivered"]);

/**
 * Decide whether an afterChange event should trigger an email.
 * Keeps the hook body thin and this logic independently testable.
 */
export function shouldSendStatusEmail({
  operation,
  previousStatus,
  newStatus,
}: {
  operation: string;
  previousStatus: string | undefined;
  newStatus: string;
}): boolean {
  return (
    operation === "update" &&
    newStatus !== previousStatus &&
    NOTIFYING_STATUSES.has(newStatus as OrderStatus)
  );
}

/**
 * Build and send the status-transition email.
 * Always resolves — swallows and logs any send error.
 */
export async function sendStatusTransitionEmail({
  ownerEmail,
  newStatus,
  childName,
}: {
  ownerEmail: string;
  newStatus: "proof_ready" | "delivered";
  childName?: string | null;
}): Promise<void> {
  const { headline, body } = messageForStatus(newStatus, childName ?? undefined);

  const accent = newStatus === "delivered" ? "blue" : "pink";
  const cta =
    newStatus === "delivered"
      ? { label: "Watch now", href: "https://yoursfairytale.com/sign-in" }
      : { label: "Watch your preview", href: "https://yoursfairytale.com/sign-in" };

  const html = renderBrandedEmail({
    preheader: headline,
    heading: headline,
    accent,
    bodyHtml: emailParagraphs([body]),
    cta,
  });

  try {
    await sendEmail({ to: ownerEmail, subject: headline, html });
  } catch (err) {
    console.error(
      `[orders/hook] Status-transition email failed (status: ${newStatus}, owner: ${ownerEmail}):`,
      err,
    );
  }
}

