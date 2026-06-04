import type { CollectionConfig } from "payload";

/**
 * Better Auth `user` model, as a Payload-managed collection.
 *
 * This is the CUSTOMER user (distinct from the `admins` collection, which is
 * Payload's own superadmin login for `/admin`). Better Auth writes to this
 * collection through our custom BA -> Payload Local-API adapter; Payload owns
 * the schema.
 *
 * Field names mirror Better Auth's authoritative `user` schema exactly
 * (camelCase: `emailVerified`, `createdAt`, `updatedAt`) so the adapter can
 * map BA field -> Payload field 1:1 with no translation.
 *
 * NOTE: `auth: true` is intentionally NOT set. BA owns credentials.
 */
export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
    group: "Auth (Better Auth)",
    hidden: false,
  },
  fields: [
    // name is optional — BA social flows may create users without one initially.
    { name: "name", type: "text" },
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
      // Canonicalize to lowercase on every write. Better Auth looks users up with
      // email.toLowerCase(), and Postgres equality is case-sensitive — so a stored
      // mixed-case email (e.g. from Stripe checkout) would never be found at
      // sign-in (new_user_signup_disabled). Storing lowercase keeps storage and
      // lookup aligned across every creation path (webhook, seed, admin).
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === "string" ? value.trim().toLowerCase() : value,
        ],
      },
    },
    {
      name: "emailVerified",
      type: "checkbox",
      required: true,
      defaultValue: false,
    },
    { name: "image", type: "text" },
    // createdAt / updatedAt are added automatically by Payload (timestamps),
    // matching BA's expected `createdAt` / `updatedAt` date fields.
  ],
  timestamps: true,
};
