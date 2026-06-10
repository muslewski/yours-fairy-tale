"use server";

/**
 * Studio actions — server-only mutations the /studio panel calls.
 *
 * SECURITY (non-negotiable): every export of a "use server" module becomes a
 * POST-reachable server action, so this file exports ONLY the guarded actions,
 * and each begins with `requireStudioUser()` (lib/studio-auth.ts) — only
 * signed-in staff mutate. The auth-skipping cores live in
 * lib/studio-order-mutations.ts (no "use server") precisely so the Next.js
 * compiler can never register them as client-invokable actions.
 */
import { revalidatePath } from "next/cache";

import { requireStudioUser } from "@/lib/studio-auth";
import {
  applyOrderStatusCore,
  applyPromisedByCore,
  type StudioActionResult,
} from "@/lib/studio-order-mutations";
import type { OrderStatus } from "@/lib/order-stages";

const GENERIC_ERROR =
  "Something went wrong while saving. Please try again in a moment.";

function revalidateStudioAndCustomer(orderId: string) {
  revalidatePath("/studio");
  revalidatePath("/studio/orders");
  revalidatePath(`/studio/orders/${orderId}`);
  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
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
