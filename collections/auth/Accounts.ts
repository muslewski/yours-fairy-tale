import type { CollectionConfig } from "payload";

/**
 * Better Auth `account` model, as a Payload-managed collection.
 *
 * Holds credential + OAuth account rows. For email/password, the hashed
 * `password` lives HERE (not on `users`).
 *
 * Field names mirror BA's authoritative `account` schema (camelCase).
 * `userId` is a relationship to `users`; the adapter queries with `depth: 0`
 * so it stays a string id.
 *
 * NOTE: `auth: true` is intentionally NOT set. BA owns credentials.
 */
export const Accounts: CollectionConfig = {
  slug: "accounts",
  admin: {
    useAsTitle: "accountId",
    group: "Auth (Better Auth)",
    hidden: false,
  },
  fields: [
    { name: "accountId", type: "text", required: true },
    { name: "providerId", type: "text", required: true },
    {
      name: "userId",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
    },
    { name: "accessToken", type: "text" },
    { name: "refreshToken", type: "text" },
    { name: "idToken", type: "text" },
    { name: "accessTokenExpiresAt", type: "date" },
    { name: "refreshTokenExpiresAt", type: "date" },
    { name: "scope", type: "text" },
    { name: "password", type: "text" },
  ],
  timestamps: true,
};
