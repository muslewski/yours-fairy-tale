"use server";

/**
 * Order actions — server-only mutations the customer dashboard calls.
 *
 * SECURITY (non-negotiable): every mutating action below begins with
 * `assertOwnsOrder`, which loads the order and confirms the signed-in customer
 * owns it. A customer must never mutate another customer's order. The guard is
 * the single doorway; do not add a mutation that skips it.
 *
 * Three customer actions live here:
 *   - uploadOrderAssets   — Task 4.2: a parent adds photos of their child; the
 *                           first successful upload advances awaiting_assets →
 *                           in_production so they see progress.
 *   - approveProof        — Task 4.3: the parent approves their preview.
 *   - requestProofChange  — Task 4.3: the parent asks for a change, saving a note.
 *
 * Reads/writes use the Payload Local API with overrideAccess: true (the Orders
 * collection is staff-only); the owner scope is enforced HERE in code, visibly,
 * not delegated to Payload access control.
 */
import { revalidatePath } from "next/cache";

import { getCustomerSession } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";
import { validateUploadFile } from "@/lib/order-upload-validation";
import { MAX_NOTE_LENGTH, type AddNoteResult } from "@/lib/order-notes-shared";

/**
 * Confirm the current customer owns `orderId`, returning the session and the
 * order. Throws if there is no session or the order belongs to someone else.
 * Call this at the TOP of every mutating action.
 */
export async function assertOwnsOrder(orderId: string) {
  const session = await getCustomerSession();
  if (!session) {
    throw new Error("You need to be signed in to do that.");
  }

  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });

  // owner is an id at depth 0 (it can be an object at higher depth — normalize).
  const ownerId =
    typeof order.owner === "object" && order.owner !== null
      ? String((order.owner as { id: string }).id)
      : String(order.owner);

  if (ownerId !== String(session.user.id)) {
    throw new Error("You do not have access to this order.");
  }

  return { session, order, payload };
}

/** The result of an upload attempt, surfaced to the client component. */
export interface UploadResult {
  added: number;
  error?: string;
}

/**
 * Task 4.2 — append customer photos to an order's `assets`.
 *
 * Ownership-checked. Validates every file is an image under the size cap and
 * rejects the batch with a clear message if any file fails (so the parent fixes
 * it and retries, rather than half-uploading). Creates a media doc per file via
 * the Local API, appends the new ids to `order.assets`, and on the first
 * successful upload advances awaiting_assets → in_production so the parent sees
 * progress and the studio is signaled. Admins can still adjust status later.
 */
export async function uploadOrderAssets(
  orderId: string,
  formData: FormData,
): Promise<UploadResult> {
  const { order, payload } = await assertOwnsOrder(orderId);

  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return { added: 0, error: "Please choose at least one photo to add." };
  }

  // Validate the whole batch first — all or nothing, so nothing is half-added.
  for (const file of files) {
    const check = validateUploadFile(file);
    if (!check.ok) {
      return { added: 0, error: check.error };
    }
  }

  const newAssetIds: string[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await payload.create({
      collection: "media",
      data: {},
      file: {
        data: buffer,
        name: file.name,
        mimetype: file.type,
        size: file.size,
      },
      overrideAccess: true,
    });
    newAssetIds.push(String(media.id));
  }

  // Preserve any assets already attached (assets is hasMany; depth 0 → ids).
  const existing = Array.isArray(order.assets)
    ? order.assets.map((a) => (typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a)))
    : [];

  // First photos in: nudge the journey forward so the parent sees movement.
  const nextStatus =
    order.status === "awaiting_assets" ? "in_production" : order.status;

  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      assets: [...existing, ...newAssetIds],
      status: nextStatus,
    },
    overrideAccess: true,
  });

  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
  return { added: newAssetIds.length };
}

/**
 * Task 4.3 — the parent approves their preview. Ownership-checked; sets the
 * order to `approved`.
 */
export async function approveProof(orderId: string): Promise<void> {
  const { payload } = await assertOwnsOrder(orderId);

  await payload.update({
    collection: "orders",
    id: orderId,
    data: { status: "approved" },
    overrideAccess: true,
  });

  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}

/**
 * Task 4.3 — the parent asks for a change to their preview. Ownership-checked;
 * sets the order to `revisions` and saves their note for the studio.
 */
export async function requestProofChange(
  orderId: string,
  note: string,
): Promise<void> {
  const { payload } = await assertOwnsOrder(orderId);

  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      status: "revisions",
      revisionNote: note?.trim() || null,
    },
    overrideAccess: true,
  });

  revalidatePath("/app");
  revalidatePath(`/app/orders/${orderId}`);
}

/**
 * Append a single customer note to an order's `customerNotes`, preserving prior
 * rows. Validates the message is non-empty and within MAX_NOTE_LENGTH. This is
 * the DB-facing core; the public `addOrderNote` action wraps it with the
 * ownership guard. Reads/writes via the Local API with overrideAccess (Orders is
 * staff-only); call sites must enforce ownership.
 */
export async function appendCustomerNote(
  orderId: string,
  message: string,
): Promise<AddNoteResult> {
  const trimmed = message?.trim() ?? "";
  if (trimmed.length === 0) {
    return { ok: false, error: "Please write a note before sending." };
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: "That note is a little long. Please shorten it." };
  }

  const payload = await getPayloadClient();
  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });

  const existing = Array.isArray(order.customerNotes) ? order.customerNotes : [];

  await payload.update({
    collection: "orders",
    id: orderId,
    data: {
      customerNotes: [
        ...existing,
        { message: trimmed, createdAt: new Date().toISOString() },
      ],
    },
    overrideAccess: true,
  });

  return { ok: true };
}

/**
 * The parent adds a note to the studio from their order page. Ownership-checked
 * (the single mutation doorway), then appended. Available at any status. Does
 * not change `status`.
 */
export async function addOrderNote(
  orderId: string,
  message: string,
): Promise<AddNoteResult> {
  await assertOwnsOrder(orderId);
  const result = await appendCustomerNote(orderId, message);
  if (result.ok) {
    revalidatePath(`/app/orders/${orderId}`);
  }
  return result;
}
