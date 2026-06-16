/**
 * in-studio-stamp — decide whether a status change should stamp
 * orders.inStudioSince. The stamp is set ONCE, the first time an order enters
 * production, and never reset (so "Back to production" after revisions keeps the
 * original start time). Pure; unit-tested in tests/lib/in-studio-stamp.test.ts.
 *
 * Spread the result into a Payload update's `data`:
 *   data: { status: nextStatus, ...inStudioStamp({ nextStatus, currentInStudioSince, now }) }
 */
import type { OrderStatus } from "@/lib/order-stages";

export function inStudioStamp(args: {
  nextStatus: OrderStatus;
  currentInStudioSince?: string | null;
  now: Date;
}): { inStudioSince: string } | Record<string, never> {
  if (args.nextStatus === "in_production" && !args.currentInStudioSince) {
    return { inStudioSince: args.now.toISOString() };
  }
  return {};
}
