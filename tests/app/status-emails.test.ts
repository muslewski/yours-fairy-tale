/**
 * Status-transition emails — TDD for the Orders afterChange hook.
 *
 * The hook fires ONLY when:
 *   - operation === "update"
 *   - doc.status !== previousDoc.status
 *   - the new status is proof_ready or delivered
 *
 * All other transitions (non-status field change, non-notifying statuses,
 * customer-initiated transitions) must NOT send an email.
 *
 * Resend is mocked — no real email is sent.
 * All DB operations run against the local Postgres via the Payload Local API.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { getPayloadClient } from "@/lib/payload";

// ---------------------------------------------------------------------------
// Mock Resend so no real email is sent in tests
// ---------------------------------------------------------------------------

const mockEmailsSend = vi
  .fn()
  .mockResolvedValue({ data: { id: "test-email-id" }, error: null });

vi.mock("resend", () => {
  function ResendMock() {
    return { emails: { send: mockEmailsSend } };
  }
  return { Resend: ResendMock };
});

// The status email now mints a one-click order tracking link; mock it so the
// hook doesn't reach Better Auth's magic-link API during these DB-only tests.
vi.mock("@/lib/order-tracking-link", () => ({
  createOrderTrackingLink: vi
    .fn()
    .mockResolvedValue("https://example.com/sign-in/verify?token=test"),
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

let payload: Awaited<ReturnType<typeof getPayloadClient>>;
let userId: string;
let userEmail: string;
const createdOrderIds: string[] = [];

beforeAll(async () => {
  payload = await getPayloadClient();
  const stamp = Date.now();
  userEmail = `status-emails-owner-${stamp}@example.com`;

  const user = await payload.create({
    collection: "users",
    data: {
      email: userEmail,
      name: "Test Parent",
      emailVerified: true,
    },
    overrideAccess: true,
  });
  userId = String(user.id);
});

afterAll(async () => {
  for (const id of createdOrderIds) {
    await payload.delete({ collection: "orders", id, overrideAccess: true }).catch(() => {});
  }
  await payload.delete({ collection: "users", id: userId, overrideAccess: true }).catch(() => {});
});

beforeEach(() => {
  mockEmailsSend.mockClear();
  // Ensure RESEND env vars are set so the email helper can run
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_test_mock";
  process.env.RESEND_FROM = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  process.env.RESEND_TO_OVERRIDE = process.env.RESEND_TO_OVERRIDE ?? "dev@example.com";
});

async function makeOrder(status: string, childName?: string) {
  const order = await payload.create({
    collection: "orders",
    data: {
      owner: userId,
      childName: childName ?? "Luna",
      status: status as never,
    },
    overrideAccess: true,
  });
  createdOrderIds.push(String(order.id));
  return String(order.id);
}

// ---------------------------------------------------------------------------
// Core notification tests
// ---------------------------------------------------------------------------

describe("status-transition emails — notifying statuses", () => {
  test("in_production → proof_ready sends exactly one email to the owner", async () => {
    const orderId = await makeOrder("in_production");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "proof_ready" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
  });

  test("proof_ready → delivered sends exactly one email to the owner", async () => {
    const orderId = await makeOrder("proof_ready");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "delivered" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
  });

  test("with RESEND_TO_OVERRIDE active, the `to` is the override address", async () => {
    const orderId = await makeOrder("in_production");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "proof_ready" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).toHaveBeenCalledTimes(1);
    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.to).toBe(process.env.RESEND_TO_OVERRIDE);
  });
});

// ---------------------------------------------------------------------------
// Non-notifying transitions must NOT email
// ---------------------------------------------------------------------------

describe("status-transition emails — non-notifying transitions", () => {
  test("a non-status field change (childName only) sends no email", async () => {
    const orderId = await makeOrder("in_production", "Mia");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { childName: "Mia Updated" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  test("awaiting_assets → in_production sends no email", async () => {
    const orderId = await makeOrder("awaiting_assets");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "in_production" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  test("paid → awaiting_assets sends no email", async () => {
    const orderId = await makeOrder("paid");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "awaiting_assets" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  test("proof_ready → revisions (customer-initiated) sends no email", async () => {
    const orderId = await makeOrder("proof_ready");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "revisions" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  test("proof_ready → approved (customer-initiated) sends no email", async () => {
    const orderId = await makeOrder("proof_ready");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "approved" },
      overrideAccess: true,
    });

    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Non-fatal: email failure must not throw out of the update
// ---------------------------------------------------------------------------

describe("status-transition emails — resilience", () => {
  test("email send failure does NOT throw out of the order update", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Resend network error"));

    const orderId = await makeOrder("in_production");

    await expect(
      payload.update({
        collection: "orders",
        id: orderId,
        data: { status: "proof_ready" },
        overrideAccess: true,
      }),
    ).resolves.toBeDefined();
  });

  test("order is still updated when email send throws", async () => {
    mockEmailsSend.mockRejectedValueOnce(new Error("Resend timeout"));

    const orderId = await makeOrder("in_production");

    await payload.update({
      collection: "orders",
      id: orderId,
      data: { status: "proof_ready" },
      overrideAccess: true,
    });

    const refreshed = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(refreshed.status).toBe("proof_ready");
  });
});
