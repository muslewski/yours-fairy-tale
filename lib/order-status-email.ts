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

  const signInLine =
    `<p>Sign in at <a href="https://yoursfairytale.com/sign-in" style="color:#17c7e2;">yoursfairytale.com/sign-in</a> to view it.</p>`;

  const html = buildStatusEmail({ headline, body, signInLine });

  try {
    await sendEmail({ to: ownerEmail, subject: headline, html });
  } catch (err) {
    console.error(
      `[orders/hook] Status-transition email failed (status: ${newStatus}, owner: ${ownerEmail}):`,
      err,
    );
  }
}

// ---------------------------------------------------------------------------
// Email HTML — brand-voice: calm, warm, parent-facing, American English
// ---------------------------------------------------------------------------

function buildStatusEmail({
  headline,
  body,
  signInLine,
}: {
  headline: string;
  body: string;
  signInLine: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="font-family: sans-serif; color: #1a1033; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <h1 style="font-size: 22px; margin-bottom: 8px;">${escapeHtml(headline)}</h1>
  <p>${escapeHtml(body)}</p>
  ${signInLine}
  <p style="margin-top: 32px; font-size: 13px; color: #888;">
    Yours Fairy Tale &mdash; a keepsake they will ask for again and again.
  </p>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
