import { describe, expect, test, vi, beforeEach } from "vitest";

// Make unstable_cache a pass-through so the resolver logic is tested directly.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(),
}));

import { getPayloadClient } from "@/lib/payload";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { readPricing } from "@/lib/pricing-source";

const mockClient = getPayloadClient as unknown as ReturnType<typeof vi.fn>;

describe("readPricing", () => {
  beforeEach(() => {
    mockClient.mockReset();
  });

  test("falls back to DEFAULT_PRICING when the client init rejects", async () => {
    mockClient.mockRejectedValue(new Error("db down"));
    await expect(readPricing()).resolves.toEqual(DEFAULT_PRICING);
  });

  test("falls back to DEFAULT_PRICING when the global is empty/unseeded", async () => {
    mockClient.mockResolvedValue({
      findGlobal: vi.fn().mockResolvedValue({ lengths: [] }),
    });
    await expect(readPricing()).resolves.toEqual(DEFAULT_PRICING);
  });

  test("falls back when details is emptied (would crash the configurator)", async () => {
    mockClient.mockResolvedValue({
      findGlobal: vi.fn().mockResolvedValue({
        lengths: [{ id: "short", label: "Short", minutes: 3, price: 200, note: null }],
        details: [],
        addOns: [],
        extraMinutePrice: 55,
        maxExtraMinutes: 30,
      }),
    });
    await expect(readPricing()).resolves.toEqual(DEFAULT_PRICING);
  });

  test("maps a populated global to the Pricing shape", async () => {
    const doc = {
      lengths: [{ id: "short", label: "Short", minutes: 3, price: 200, note: null }],
      details: [{ id: "basic", label: "Basic", multiplier: 1, note: null }],
      addOns: [{ id: "narration", label: "Custom narration", price: 33, note: null }],
      extraMinutePrice: 77,
      maxExtraMinutes: 20,
    };
    mockClient.mockResolvedValue({
      findGlobal: vi.fn().mockResolvedValue(doc),
    });

    const p = await readPricing();
    expect(p.extraMinutePrice).toBe(77);
    expect(p.maxExtraMinutes).toBe(20);
    expect(p.lengths[0]).toEqual({ id: "short", label: "Short", minutes: 3, price: 200, note: "" });
    expect(p.addOns[0].price).toBe(33);
  });
});
