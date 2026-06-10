import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";

/**
 * Series waitlist signups (the /series page form).
 *
 * Rows are created ONLY by app/api/waitlist/route.ts via the Local API with
 * overrideAccess — the public REST/GraphQL surface stays staff-only, same as
 * Orders. Email is unique + lowercased so a parent signing up twice is a
 * no-op, not a duplicate row.
 */
export const Waitlist: CollectionConfig = {
  slug: "waitlist",
  admin: {
    useAsTitle: "email",
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
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
      // Same canonicalization as users.email (see collections/auth/Users.ts).
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === "string" ? value.trim().toLowerCase() : value,
        ],
      },
    },
    {
      name: "source",
      type: "text",
      admin: { description: 'Where the signup came from (e.g. "series").' },
    },
  ],
  timestamps: true,
};
