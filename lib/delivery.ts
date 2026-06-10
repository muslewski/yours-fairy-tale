/**
 * Delivery promise — the studio's "promised by" date and the customer
 * countdown, as pure date math (no React, no DB; unit-tested).
 *
 * Defaults are deliberately conservative and live HERE as the single source of
 * truth: the Stripe webhook stamps promisedBy at order creation, and the
 * studio workstation can override per order. Tune PRODUCTION_DAYS as real
 * production pace becomes known.
 */
import type { OrderStatus } from "@/lib/order-stages";

/** Production window per film length, in days from purchase. */
export const PRODUCTION_DAYS: Record<"short" | "medium" | "long", number> = {
  short: 7,
  medium: 14,
  long: 21,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The automatic promise for a new order: purchase time + the length's window.
 * Returns null for unknown/missing lengths — such orders get no automatic
 * promise (the studio can set one by hand).
 */
export function promisedByForLength(length: unknown, from: Date): Date | null {
  if (length !== "short" && length !== "medium" && length !== "long") {
    return null;
  }
  return new Date(from.getTime() + PRODUCTION_DAYS[length] * DAY_MS);
}

/** What the parent's countdown card should show right now. */
export type CountdownState =
  | { kind: "hidden" }
  | { kind: "soon"; promisedBy: Date }
  | { kind: "overdue" }
  | { kind: "counting"; days: number; fractionElapsed: number; promisedBy: Date };

/**
 * Resolve the countdown for an order. Calm by design: never negative numbers
 * (past the date → "overdue" variant), no ticking seconds (days granularity),
 * hidden once delivered and on refunded/cancelled orders.
 */
export function countdownState(args: {
  status: OrderStatus;
  promisedBy?: string | null;
  createdAt?: string | null;
  now: Date;
}): CountdownState {
  const { status, promisedBy, createdAt, now } = args;
  if (!promisedBy) return { kind: "hidden" };
  if (status === "delivered" || status === "refunded" || status === "cancelled") {
    return { kind: "hidden" };
  }

  const target = new Date(promisedBy);
  if (Number.isNaN(target.getTime())) return { kind: "hidden" };

  const remainingMs = target.getTime() - now.getTime();
  if (remainingMs <= 0) return { kind: "overdue" };

  const days = Math.ceil(remainingMs / DAY_MS);
  if (days <= 1) return { kind: "soon", promisedBy: target };

  let fractionElapsed = 0;
  const created = createdAt ? new Date(createdAt) : null;
  if (created && !Number.isNaN(created.getTime())) {
    const spanMs = target.getTime() - created.getTime();
    if (spanMs > 0) {
      fractionElapsed = Math.min(
        1,
        Math.max(0, (now.getTime() - created.getTime()) / spanMs),
      );
    }
  }
  return { kind: "counting", days, fractionElapsed, promisedBy: target };
}

/**
 * "Saturday, June 20" — UTC so server timezone never shifts the promise.
 * Invalid dates render as an empty string rather than throwing.
 */
export function formatPromisedDate(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
