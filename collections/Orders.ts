import type { CollectionAfterChangeHook, CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";
import {
  shouldSendStatusEmail,
  sendStatusTransitionEmail,
} from "@/lib/order-status-email";

/**
 * Emails the order owner when the studio advances to a milestone they are
 * waiting for (proof_ready or delivered). Fires on update + real status change
 * only; errors are non-fatal.
 */
const statusTransitionEmailHook: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  const newStatus: string = doc.status;
  const previousStatus: string | undefined = previousDoc?.status;

  if (!shouldSendStatusEmail({ operation, previousStatus, newStatus })) {
    return;
  }

  // Resolve the owner's email. `doc.owner` may be an id or a populated object.
  let ownerEmail: string | null = null;

  if (typeof doc.owner === "object" && doc.owner !== null && "email" in doc.owner) {
    // Already populated
    ownerEmail = (doc.owner as { email: string }).email ?? null;
  } else {
    // Fetch the user via the Local API
    const ownerId = typeof doc.owner === "object" ? (doc.owner as { id: string }).id : doc.owner;
    try {
      const user = await req.payload.findByID({
        collection: "users",
        id: String(ownerId),
        depth: 0,
        overrideAccess: true,
      });
      ownerEmail = user?.email ?? null;
    } catch (err) {
      console.error("[orders/hook] Failed to fetch owner email for email notification:", err);
    }
  }

  if (!ownerEmail) {
    console.warn(
      `[orders/hook] Could not resolve owner email for order ${doc.id} — skipping notification.`,
    );
    return;
  }

  await sendStatusTransitionEmail({
    orderId: String(doc.id),
    ownerEmail,
    newStatus: newStatus as "proof_ready" | "delivered",
    childName: doc.childName ?? null,
  });
};

/**
 * An Order represents a single book purchase by a customer.
 *
 * - `owner` links to the Better Auth `users` collection (the customer).
 * - `status` drives the production workflow; it defaults to `paid` (the state
 *   immediately after Stripe checkout completes).
 * - Access is staff-only via `adminOnly`; the customer-facing dashboard reads
 *   orders via the Payload Local API in server components (bypasses access
 *   control), not via the REST/GraphQL API.
 */
export const Orders: CollectionConfig = {
  slug: "orders",
  admin: {
    useAsTitle: "childName",
    group: "Commerce",
  },
  access: {
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [statusTransitionEmailHook],
  },
  fields: [
    {
      name: "owner",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
    },
    {
      name: "stripeSessionId",
      type: "text",
      unique: true,
      index: true,
    },
    {
      name: "stripePaymentIntentId",
      type: "text",
      index: true,
    },
    { name: "childName", type: "text" },
    {
      name: "world",
      type: "select",
      options: [
        { label: "Bedtime", value: "bedtime" },
        { label: "Space", value: "space" },
        { label: "Sea", value: "sea" },
        { label: "Forest", value: "forest" },
        { label: "Dragons", value: "dragons" },
        { label: "Birthday", value: "birthday" },
        { label: "Custom", value: "custom" },
      ],
    },
    {
      name: "length",
      type: "select",
      options: [
        { label: "Short", value: "short" },
        { label: "Medium", value: "medium" },
        { label: "Long", value: "long" },
      ],
    },
    {
      name: "detailLevel",
      type: "select",
      options: [
        { label: "Basic", value: "basic" },
        { label: "Detailed", value: "detailed" },
        { label: "Premium", value: "premium" },
      ],
    },
    { name: "extraMinutes", type: "number", min: 0, defaultValue: 0 },
    { name: "addOns", type: "text", hasMany: true },
    {
      name: "plotNote",
      type: "textarea",
      admin: {
        description: "The parent's own plot idea from the configurator (optional).",
      },
    },
    {
      name: "assets",
      type: "relationship",
      relationTo: "media",
      hasMany: true,
    },
    {
      name: "proof",
      type: "relationship",
      relationTo: "media",
    },
    {
      name: "finalVideo",
      type: "relationship",
      relationTo: "media",
    },
    {
      name: "revisionNote",
      type: "textarea",
      admin: {
        description:
          "The change the customer asked for when reviewing their preview. Set by the customer dashboard when they request a revision.",
      },
    },
    {
      name: "customerNotes",
      type: "array",
      labels: { singular: "Customer note", plural: "Customer notes" },
      admin: {
        description:
          "Notes the parent added from their order page. Read-only history; newest last.",
      },
      fields: [
        { name: "message", type: "textarea", required: true },
        { name: "createdAt", type: "date", admin: { readOnly: true } },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "paid",
      options: [
        { label: "Paid", value: "paid" },
        { label: "Awaiting Assets", value: "awaiting_assets" },
        { label: "In Production", value: "in_production" },
        { label: "Proof Ready", value: "proof_ready" },
        { label: "Revisions", value: "revisions" },
        { label: "Approved", value: "approved" },
        { label: "Delivered", value: "delivered" },
        { label: "Refunded", value: "refunded" },
        { label: "Cancelled", value: "cancelled" },
      ],
    },
    {
      name: "amountTotalCents",
      type: "number",
      min: 0,
      admin: {
        description:
          "What Stripe actually charged, in cents. Set by the checkout webhook. " +
          "Not recomputed from pricing (prices can change; the charge is history).",
      },
    },
    {
      name: "promisedBy",
      type: "date",
      admin: {
        description:
          "The delivery promise shown to the parent. Auto-set from film length " +
          "at purchase (lib/delivery.ts); the studio may adjust it per order.",
      },
    },
    {
      name: "inStudioSince",
      type: "date",
      admin: {
        readOnly: true,
        description:
          "When the order first entered production (status → in_production). " +
          "Stamped once by the system; drives the customer's 'in the studio for …' " +
          "live clock. Never reset on re-entry.",
      },
    },
    {
      name: "accessToken",
      type: "text",
      index: true,
      admin: {
        readOnly: true,
        description:
          "Durable, reusable token for the order's email links (/open/<token>). " +
          "Signs the customer in and lands them on this order; refreshed to 30 " +
          "days on every status email. System-managed; never shown in the UI.",
      },
    },
    {
      name: "accessTokenExpiresAt",
      type: "date",
      admin: {
        readOnly: true,
        description:
          "When the order's /open/<token> link stops working. Refreshed to 30 " +
          "days on every status email. System-managed.",
      },
    },
  ],
  timestamps: true,
};
