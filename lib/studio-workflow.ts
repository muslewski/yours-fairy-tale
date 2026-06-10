/**
 * Studio workflow core — the panel's business rules as pure data + functions.
 * No React, no DB, no Next.js; unit-tested in tests/studio/workflow.test.ts.
 *
 * Staff-facing labels live here (sentence case, calm — same voice as the rest
 * of the site even though only the two of us read it). Customer-facing copy
 * does NOT live here — see lib/order-stages.ts and lib/delivery.ts.
 */
import type { OrderStatus } from "@/lib/order-stages";

/** The slice of an order doc the studio pages work with (depth 0). */
export interface StudioOrder {
  id: string;
  status: OrderStatus;
  createdAt: string;
  childName?: string | null;
  world?: string | null;
  length?: string | null;
  detailLevel?: string | null;
  amountTotalCents?: number | null;
  promisedBy?: string | null;
  revisionNote?: string | null;
  stripePaymentIntentId?: string | null;
  proof?: unknown;
  finalVideo?: unknown;
}

export const ALL_STATUSES: readonly OrderStatus[] = [
  "paid",
  "awaiting_assets",
  "in_production",
  "proof_ready",
  "revisions",
  "approved",
  "delivered",
  "refunded",
  "cancelled",
] as const;

/** Studio chip label + tone per status (tone maps to brand colors in the UI). */
export const STATUS_CHIPS: Record<
  OrderStatus,
  { label: string; tone: "yellow" | "pink" | "blue" | "plain" }
> = {
  paid: { label: "New order", tone: "yellow" },
  awaiting_assets: { label: "Waiting for photos", tone: "plain" },
  in_production: { label: "In production", tone: "plain" },
  proof_ready: { label: "With the parent", tone: "plain" },
  revisions: { label: "Changes requested", tone: "pink" },
  approved: { label: "Ready to deliver", tone: "blue" },
  delivered: { label: "Delivered", tone: "plain" },
  refunded: { label: "Refunded", tone: "plain" },
  cancelled: { label: "Cancelled", tone: "plain" },
};

/** The natural next steps offered per status (spec's transition table). */
export const NEXT_STEPS: Record<
  OrderStatus,
  { label: string; to: OrderStatus }[]
> = {
  paid: [
    { label: "Request photos", to: "awaiting_assets" },
    { label: "Start production", to: "in_production" },
  ],
  awaiting_assets: [{ label: "Start production", to: "in_production" }],
  in_production: [{ label: "Share the proof", to: "proof_ready" }],
  proof_ready: [],
  revisions: [
    { label: "Back to production", to: "in_production" },
    { label: "Share a new proof", to: "proof_ready" },
  ],
  approved: [{ label: "Mark delivered", to: "delivered" }],
  delivered: [],
  refunded: [],
  cancelled: [],
};

/**
 * Server-enforced guardrails: what must be attached before an order may enter
 * a status. The buttons disable in the UI too, but THIS is the boundary.
 */
export function requirementFor(
  status: OrderStatus,
): "proof" | "finalVideo" | null {
  if (status === "proof_ready") return "proof";
  if (status === "delivered") return "finalVideo";
  return null;
}

const ATTENTION: readonly OrderStatus[] = ["paid", "revisions", "approved"];
const MOVING: readonly OrderStatus[] = [
  "awaiting_assets",
  "in_production",
  "proof_ready",
];

const byOldestFirst = (a: StudioOrder, b: StudioOrder) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

/** Orders whose next move is the studio's, oldest first. */
export function needsAttention(orders: StudioOrder[]): StudioOrder[] {
  return orders.filter((o) => ATTENTION.includes(o.status)).sort(byOldestFirst);
}

/** Orders that are moving but are someone else's turn / already in progress. */
export function inTheWorks(orders: StudioOrder[]): StudioOrder[] {
  return orders.filter((o) => MOVING.includes(o.status)).sort(byOldestFirst);
}

export interface RevenueWindow {
  cents: number;
  count: number;
}

export interface RevenueTotals {
  allTime: RevenueWindow;
  thisMonth: RevenueWindow;
  last30Days: RevenueWindow;
  /** True when a counted order has no recorded amount (pre-launch rows). */
  hasUnrecordedAmounts: boolean;
}

/**
 * Revenue = sum of what Stripe charged, over orders that are not refunded and
 * not cancelled (a dispute means the money is gone). Orders with no recorded
 * amount count as $0 and raise the footnote flag.
 */
export function computeRevenueTotals(
  orders: StudioOrder[],
  now: Date,
): RevenueTotals {
  const counted = orders.filter(
    (o) => o.status !== "refunded" && o.status !== "cancelled",
  );
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  const windowOf = (filter: (createdMs: number) => boolean): RevenueWindow => {
    let cents = 0;
    let count = 0;
    for (const o of counted) {
      const createdMs = new Date(o.createdAt).getTime();
      if (!filter(createdMs)) continue;
      count += 1;
      cents += o.amountTotalCents ?? 0;
    }
    return { cents, count };
  };

  return {
    allTime: windowOf(() => true),
    thisMonth: windowOf((ms) => ms >= monthStart),
    last30Days: windowOf((ms) => ms >= thirtyDaysAgo),
    hasUnrecordedAmounts: counted.some(
      (o) => o.amountTotalCents === null || o.amountTotalCents === undefined,
    ),
  };
}

/** "$4,350" for whole dollars, "$450.50" when cents are in play. */
export function formatCents(cents: number): string {
  const wholeDollars = cents % 100 === 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: wholeDollars ? 0 : 2,
    maximumFractionDigits: wholeDollars ? 0 : 2,
  }).format(cents / 100);
}

/** "3 hours ago" / "2 days ago" — coarse, for queue rows. */
export function formatAge(createdAt: string, now: Date): string {
  const ms = Math.max(0, now.getTime() - new Date(createdAt).getTime());
  const hours = Math.floor(ms / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
