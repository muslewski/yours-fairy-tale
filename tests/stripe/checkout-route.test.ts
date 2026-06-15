import { describe, expect, test, vi } from "vitest";

// Mock the Stripe client so create() throws — we are testing the route's error
// handling, not Stripe.
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockRejectedValue(new Error("Stripe is down")),
      },
    },
  },
}));

import { POST } from "@/app/api/stripe/checkout/route";

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/stripe/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/stripe/checkout error handling", () => {
  test("returns 502 (not an unhandled 500) when Stripe create throws", async () => {
    const res = await POST(
      postRequest({
        world: "bedtime",
        length: "medium",
        detail: "basic",
        extraMinutes: 0,
        addOns: ["narration"],
      }) as never,
    );
    expect(res.status).toBe(502);
    const json = (await res.json()) as { error?: string };
    expect(json.error).toBeTruthy();
  });
});
