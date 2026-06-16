/**
 * Order actions — TDD for Task 4.2 (photo upload) and Task 4.3 (proof review).
 *
 * These are DB-backed but network-free: they boot Payload against the local
 * Postgres (same as tests/auth/gating.test.ts) and create their own users +
 * orders. The session read is mocked via vi.mock("@/lib/customer-data") so we
 * can simulate "caller is user A" vs "caller is user B" and prove that the
 * ownership guard rejects cross-customer mutation.
 *
 * The non-negotiable invariant under test: every mutating action verifies the
 * caller owns the order. A customer must never mutate another customer's order.
 *
 * Upload note: feeding a real multipart File through a server action in the
 * node test env is awkward, so we unit-test the upload validation predicate
 * (`validateUploadFile`) and the shared ownership guard directly, rather than
 * round-tripping an actual file through Payload's upload pipeline. The guard is
 * the security-critical part and it is exercised end-to-end here.
 */
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

// The session read lives in customer-data; mock it so we can inject the caller.
const mockGetCustomerSession = vi.fn();
vi.mock("@/lib/customer-data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/customer-data")>();
  return {
    ...actual,
    getCustomerSession: () => mockGetCustomerSession(),
  };
});

// revalidatePath is a Next server-only side effect; stub it so actions don't
// throw outside a request scope.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// The studio notification is a network side effect; mock the transport so the
// test asserts the call without sending mail.
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { getPayloadClient } from "@/lib/payload";
import { sendEmail } from "@/lib/email";
import {
  addOrderNote,
  approveProof,
  requestProofChange,
} from "@/lib/order-actions";
import {
  validateUploadFile,
  MAX_UPLOAD_BYTES,
} from "@/lib/order-upload-validation";

let payload: Awaited<ReturnType<typeof getPayloadClient>>;
let userAId: string;
let userBId: string;
const createdOrderIds: string[] = [];

beforeAll(async () => {
  payload = await getPayloadClient();
  const stamp = Date.now();
  const userA = await payload.create({
    collection: "users",
    data: {
      email: `order-actions-a-${stamp}@example.com`,
      name: "Owner A",
      emailVerified: false,
    },
  });
  const userB = await payload.create({
    collection: "users",
    data: {
      email: `order-actions-b-${stamp}@example.com`,
      name: "Intruder B",
      emailVerified: false,
    },
  });
  userAId = String(userA.id);
  userBId = String(userB.id);
});

afterAll(async () => {
  for (const id of createdOrderIds) {
    await payload.delete({ collection: "orders", id }).catch(() => {});
  }
  await payload.delete({ collection: "users", id: userAId }).catch(() => {});
  await payload.delete({ collection: "users", id: userBId }).catch(() => {});
});

async function makeOrder(status: string) {
  const order = await payload.create({
    collection: "orders",
    data: {
      owner: userAId,
      childName: "Mia",
      status: status as never,
    },
  });
  createdOrderIds.push(String(order.id));
  return String(order.id);
}

function sessionFor(userId: string) {
  return { user: { id: userId } };
}

// ─── Upload validation predicate ──────────────────────────────────────────────

describe("validateUploadFile", () => {
  test("accepts an image under the size cap", () => {
    const file = { type: "image/jpeg", size: 1_000_000, name: "a.jpg" };
    expect(validateUploadFile(file).ok).toBe(true);
  });

  test("rejects a non-image with a clear message", () => {
    const file = { type: "application/pdf", size: 1000, name: "a.pdf" };
    const res = validateUploadFile(file);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.toLowerCase()).toContain("image");
  });

  test("rejects an image over the size cap", () => {
    const file = {
      type: "image/png",
      size: MAX_UPLOAD_BYTES + 1,
      name: "huge.png",
    };
    const res = validateUploadFile(file);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/MB|large|big/i);
  });
});

// ─── Ownership guard ──────────────────────────────────────────────────────────

describe("ownership enforcement", () => {
  test("approveProof by a non-owner is rejected and does not mutate", async () => {
    const orderId = await makeOrder("proof_ready");
    mockGetCustomerSession.mockResolvedValue(sessionFor(userBId));

    await expect(approveProof(orderId)).rejects.toThrow();

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.status).toBe("proof_ready");
  });

  test("requestProofChange by a non-owner is rejected and does not mutate", async () => {
    const orderId = await makeOrder("proof_ready");
    mockGetCustomerSession.mockResolvedValue(sessionFor(userBId));

    await expect(
      requestProofChange(orderId, "Please brighten it"),
    ).rejects.toThrow();

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.status).toBe("proof_ready");
    expect(after.revisionNote ?? null).toBeNull();
  });

  test("an unauthenticated caller is rejected", async () => {
    const orderId = await makeOrder("proof_ready");
    mockGetCustomerSession.mockResolvedValue(null);

    await expect(approveProof(orderId)).rejects.toThrow();

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.status).toBe("proof_ready");
  });
});

// ─── Proof review actions (owner) ─────────────────────────────────────────────

describe("proof review actions by the owner", () => {
  test("approveProof sets status to approved", async () => {
    const orderId = await makeOrder("proof_ready");
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    await approveProof(orderId);

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.status).toBe("approved");
  });

  test("requestProofChange sets status to revisions and stores the note", async () => {
    const orderId = await makeOrder("proof_ready");
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    await requestProofChange(orderId, "Could the dragon be a little friendlier?");

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.status).toBe("revisions");
    expect(after.revisionNote).toBe(
      "Could the dragon be a little friendlier?",
    );
  });

  test("requestProofChange also leaves the parent a note receipt", async () => {
    const orderId = await makeOrder("proof_ready");
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));

    await requestProofChange(orderId, "Please make the castle taller.");

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.status).toBe("revisions");
    expect(after.revisionNote).toBe("Please make the castle taller.");
    // The parent now sees their request in the notes thread.
    expect(after.customerNotes?.at(-1)?.message).toBe(
      "Please make the castle taller.",
    );
  });
});

// ─── Customer notes (owner) ───────────────────────────────────────────────────

describe("addOrderNote by the owner", () => {
  test("appends the note and sends a non-fatal studio notification", async () => {
    const orderId = await makeOrder("in_production");
    mockGetCustomerSession.mockResolvedValue(sessionFor(userAId));
    (sendEmail as ReturnType<typeof vi.fn>).mockClear();

    const res = await addOrderNote(orderId, "Please fix her name to 'Mia'.");
    expect(res.ok).toBe(true);

    const after = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
    expect(after.customerNotes?.at(-1)?.message).toBe(
      "Please fix her name to 'Mia'.",
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.subject).toMatch(/note/i);
  });
});
