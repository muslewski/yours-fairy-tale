/**
 * Studio workflow core tests — pure, no DB, no DOM.
 */
import { describe, expect, test } from "vitest";

import {
  STATUS_CHIPS,
  NEXT_STEPS,
  requirementFor,
  needsAttention,
  inTheWorks,
  computeRevenueTotals,
  formatCents,
  formatAge,
  type StudioOrder,
} from "@/lib/studio-workflow";

const NOW = new Date("2026-06-10T12:00:00.000Z");

function order(partial: Partial<StudioOrder> & { id: string }): StudioOrder {
  return {
    status: "paid",
    createdAt: "2026-06-01T00:00:00.000Z",
    ...partial,
  } as StudioOrder;
}

describe("chips and transitions", () => {
  test("every status has a chip label", () => {
    expect(STATUS_CHIPS.paid.label).toBe("New order");
    expect(STATUS_CHIPS.revisions.label).toBe("Changes requested");
    expect(STATUS_CHIPS.approved.label).toBe("Ready to deliver");
    expect(Object.keys(STATUS_CHIPS)).toHaveLength(9);
  });

  test("next steps follow the spec table", () => {
    expect(NEXT_STEPS.paid.map((s) => s.to)).toEqual([
      "awaiting_assets",
      "in_production",
    ]);
    expect(NEXT_STEPS.revisions.map((s) => s.to)).toEqual([
      "in_production",
      "proof_ready",
    ]);
    expect(NEXT_STEPS.approved.map((s) => s.to)).toEqual(["delivered"]);
    expect(NEXT_STEPS.proof_ready).toEqual([]);
    expect(NEXT_STEPS.delivered).toEqual([]);
  });

  test("guardrails: proof_ready needs a proof, delivered needs the final film", () => {
    expect(requirementFor("proof_ready")).toBe("proof");
    expect(requirementFor("delivered")).toBe("finalVideo");
    expect(requirementFor("in_production")).toBeNull();
  });
});

describe("queues", () => {
  const docs: StudioOrder[] = [
    order({ id: "a", status: "paid", createdAt: "2026-06-09T00:00:00.000Z" }),
    order({ id: "b", status: "revisions", createdAt: "2026-06-05T00:00:00.000Z" }),
    order({ id: "c", status: "in_production", createdAt: "2026-06-06T00:00:00.000Z" }),
    order({ id: "d", status: "delivered", createdAt: "2026-06-01T00:00:00.000Z" }),
    order({ id: "e", status: "approved", createdAt: "2026-06-08T00:00:00.000Z" }),
    order({ id: "f", status: "proof_ready", createdAt: "2026-06-07T00:00:00.000Z" }),
  ];

  test("needsAttention picks the studio's-move statuses, oldest first", () => {
    expect(needsAttention(docs).map((o) => o.id)).toEqual(["b", "e", "a"]);
  });

  test("inTheWorks picks moving orders, oldest first", () => {
    expect(inTheWorks(docs).map((o) => o.id)).toEqual(["c", "f"]);
  });
});

describe("revenue", () => {
  const docs: StudioOrder[] = [
    // counted, this month + last 30 days
    order({ id: "1", amountTotalCents: 45000, createdAt: "2026-06-02T00:00:00.000Z", status: "delivered" }),
    // counted, NOT this calendar month, inside last 30 days
    order({ id: "2", amountTotalCents: 30000, createdAt: "2026-05-20T00:00:00.000Z", status: "in_production" }),
    // counted all-time only
    order({ id: "3", amountTotalCents: 90000, createdAt: "2026-03-01T00:00:00.000Z", status: "delivered" }),
    // refunded → excluded entirely
    order({ id: "4", amountTotalCents: 45000, createdAt: "2026-06-03T00:00:00.000Z", status: "refunded" }),
    // cancelled (dispute) → excluded entirely
    order({ id: "5", amountTotalCents: 45000, createdAt: "2026-06-04T00:00:00.000Z", status: "cancelled" }),
    // no recorded amount → counts as $0 but flags the footnote
    order({ id: "6", createdAt: "2026-06-05T00:00:00.000Z", status: "paid" }),
  ];

  test("totals exclude refunded/cancelled and window correctly", () => {
    const totals = computeRevenueTotals(docs, NOW);
    expect(totals.allTime).toEqual({ cents: 165000, count: 4 });
    expect(totals.thisMonth).toEqual({ cents: 45000, count: 2 });
    expect(totals.last30Days).toEqual({ cents: 75000, count: 3 });
    expect(totals.hasUnrecordedAmounts).toBe(true);
  });

  test("hasUnrecordedAmounts is false when every counted order has an amount", () => {
    const totals = computeRevenueTotals(docs.slice(0, 3), NOW);
    expect(totals.hasUnrecordedAmounts).toBe(false);
  });

  test("window boundaries are inclusive", () => {
    const docs: StudioOrder[] = [
      order({ id: "m", amountTotalCents: 100, createdAt: "2026-06-01T00:00:00.000Z", status: "paid" }),
      order({ id: "r", amountTotalCents: 200, createdAt: "2026-05-11T12:00:00.000Z", status: "paid" }),
    ];
    const totals = computeRevenueTotals(docs, NOW);
    expect(totals.thisMonth).toEqual({ cents: 100, count: 1 });   // May 11 is last month
    expect(totals.last30Days).toEqual({ cents: 300, count: 2 });  // exactly 30*24h ago counts
  });
});

describe("formatCents", () => {
  test("whole dollars get no decimals; cents keep two", () => {
    expect(formatCents(435000)).toBe("$4,350");
    expect(formatCents(0)).toBe("$0");
    expect(formatCents(45050)).toBe("$450.50");
  });
});

describe("formatAge", () => {
  test("coarse buckets with singulars", () => {
    expect(formatAge("2026-06-10T11:30:00.000Z", NOW)).toBe("just now");
    expect(formatAge("2026-06-10T11:00:00.000Z", NOW)).toBe("1 hour ago");
    expect(formatAge("2026-06-09T12:00:00.000Z", NOW)).toBe("1 day ago");
    expect(formatAge("2026-06-07T00:00:00.000Z", NOW)).toBe("3 days ago");
  });
});
