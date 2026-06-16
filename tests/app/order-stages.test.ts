/**
 * Order-stages — pure stage logic for the production timeline.
 *
 * TDD core for the dashboard timeline. These tests assert the single source of
 * truth that the <StatusTimeline /> renders from: the ordered stage list, the
 * status → active-stage-index mapping, the two off-the-happy-path terminal
 * sentinels, and the parent-facing contextual copy.
 *
 * No DOM, no DB — pure functions. This file is written FIRST and must fail
 * until lib/order-stages.ts exists.
 */
import { describe, expect, test } from "vitest";

import {
  STAGES,
  stageForStatus,
  messageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";

describe("STAGES", () => {
  test("has the five production stages in order (photos are pre-checkout, not a step)", () => {
    expect(STAGES.map((s) => s.key)).toEqual([
      "received",
      "studio",
      "preview",
      "finishing",
      "ready",
    ]);
  });

  test("every stage has a non-empty label", () => {
    for (const stage of STAGES) {
      expect(stage.label.length).toBeGreaterThan(0);
    }
  });
});

describe("stageForStatus — happy-path mapping", () => {
  const cases: Array<[OrderStatus, number]> = [
    ["paid", 0],
    ["awaiting_assets", 0],
    ["in_production", 1],
    ["proof_ready", 2],
    ["revisions", 2],
    ["approved", 3],
    ["delivered", 4],
  ];

  test.each(cases)("status %s → active stage index %i", (status, index) => {
    const result = stageForStatus(status);
    expect(result).toEqual({ activeIndex: index });
  });

  test("the active index always points at a real stage", () => {
    for (const [status] of cases) {
      const result = stageForStatus(status);
      if ("activeIndex" in result) {
        expect(STAGES[result.activeIndex]).toBeDefined();
      }
    }
  });
});

describe("stageForStatus — terminal sentinels (off the happy path)", () => {
  test("refunded → terminal refunded sentinel (no timeline)", () => {
    expect(stageForStatus("refunded")).toEqual({ terminal: "refunded" });
  });

  test("cancelled → terminal cancelled sentinel (no timeline)", () => {
    expect(stageForStatus("cancelled")).toEqual({ terminal: "cancelled" });
  });
});

describe("messageForStatus — parent-facing contextual copy", () => {
  test("returns a headline and body for every happy-path status", () => {
    const statuses: OrderStatus[] = [
      "paid",
      "awaiting_assets",
      "in_production",
      "proof_ready",
      "revisions",
      "approved",
      "delivered",
    ];
    for (const status of statuses) {
      const msg = messageForStatus(status);
      expect(msg.headline.length).toBeGreaterThan(0);
      expect(msg.body.length).toBeGreaterThan(0);
    }
  });

  test("returns a message for the terminal statuses too", () => {
    expect(messageForStatus("refunded").body.length).toBeGreaterThan(0);
    expect(messageForStatus("cancelled").body.length).toBeGreaterThan(0);
  });

  test("interpolates the child's name when provided", () => {
    const msg = messageForStatus("awaiting_assets", "Mia");
    expect(msg.body).toContain("Mia");
  });

  test("reads naturally without a child's name (no leftover placeholder)", () => {
    const msg = messageForStatus("awaiting_assets");
    expect(msg.body).not.toContain("{");
    expect(msg.body.length).toBeGreaterThan(0);
  });

  test("delivered copy celebrates readiness, names the child when given", () => {
    expect(messageForStatus("delivered", "Theo").headline).toContain("Theo");
    const generic = messageForStatus("delivered");
    expect(generic.headline).not.toContain("{");
  });
});
