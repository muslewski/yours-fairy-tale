import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

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
        { label: "Short (16 pages)", value: "short" },
        { label: "Standard (24 pages)", value: "standard" },
        { label: "Long (32 pages)", value: "long" },
      ],
    },
    {
      name: "detailLevel",
      type: "select",
      options: [
        { label: "Classic", value: "classic" },
        { label: "Detailed", value: "detailed" },
        { label: "Premium", value: "premium" },
      ],
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
  ],
  timestamps: true,
};
