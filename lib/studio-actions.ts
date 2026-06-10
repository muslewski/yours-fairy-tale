"use server";

/**
 * Studio actions — server-only mutations the /studio panel calls.
 *
 * SECURITY (non-negotiable): every exported ACTION begins with
 * `requireStudioUser()` (lib/studio-auth.ts) — only signed-in staff mutate.
 * The *Core functions skip that check ON PURPOSE so DB tests can exercise the
 * guardrails directly; they must only ever be called from this module's
 * actions (or tests).
 *
 * Status changes go through the Payload Local API, so the Orders afterChange
 * hook still fires — moving to proof_ready or delivered emails the parent
 * exactly as it does from /admin.
 */
import { revalidatePath } from "next/cache";

import { requireStudioUser } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";
import { ALL_STATUSES, requirementFor } from "@/lib/studio-workflow";
import type { OrderStatus } from "@/lib/order-stages";

export type StudioActionResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR =
  "Something went wrong while saving. Please try again in a moment.";

function revalidateStudioAndCustomer(orderId: string) {
  revalidatePath("/studio");
  revalidatePath("/studio/orders");
  revalidatePath(`/studio/orders/${orderId}`);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}

/**
 * Core: set an order's status, enforcing the attachment guardrails
 * (proof_ready needs a proof; delivered needs the final film).
 */
export async function applyOrderStatusCore(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StudioActionResult> {
  if (!ALL_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "That is not a valid status." };
  }

  const payload = await getPayloadClient();
  let order;
  try {
    order = await payload.findByID({
      collection: "orders",
      id: orderId,
      depth: 0,
      overrideAccess: true,
    });
  } catch {
    return { ok: false, error: "We could not find that order." };
  }

  const requirement = requirementFor(nextStatus);
  if (requirement === "proof" && !order.proof) {
    return {
      ok: false,
      error: "Add a preview film before sharing the proof with the parent.",
    };
  }
  if (requirement === "finalVideo" && !order.finalVideo) {
    return {
      ok: false,
      error: "Upload the final film before marking the order delivered.",
    };
  }

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: nextStatus },
    overrideAccess: true,
  });
  return { ok: true };
}

/** Action: staff sets an order's status (guardrails enforced in the core). */
export async function setOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<StudioActionResult> {
  await requireStudioUser();
  try {
    const result = await applyOrderStatusCore(orderId, nextStatus);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setOrderStatus failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Core: set (ISO string) or clear (null) an order's promised-by date. */
export async function applyPromisedByCore(
  orderId: string,
  promisedByIso: string | null,
): Promise<StudioActionResult> {
  if (promisedByIso !== null) {
    const parsed = new Date(promisedByIso);
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "That date did not look right. Please pick it again." };
    }
  }
  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { promisedBy: promisedByIso },
      overrideAccess: true,
    });
  } catch {
    return { ok: false, error: "We could not find that order." };
  }
  return { ok: true };
}

/** Action: staff adjusts the delivery promise shown to the parent. */
export async function setPromisedBy(
  orderId: string,
  promisedByIso: string | null,
): Promise<StudioActionResult> {
  await requireStudioUser();
  try {
    const result = await applyPromisedByCore(orderId, promisedByIso);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setPromisedBy failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
