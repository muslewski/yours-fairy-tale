import type { CollectionConfig } from "payload";

/**
 * Better Auth `session` model, as a Payload-managed collection.
 *
 * Field names mirror BA's authoritative `session` schema (camelCase).
 * `userId` is a relationship to the `users` collection — BA treats it as a
 * plain string id, so the adapter always queries this collection with
 * `depth: 0` to keep `userId` a string, not a populated object.
 *
 * NOTE: `auth: true` is intentionally NOT set. BA owns credentials.
 * NOTE: `activeOrganizationId` (org plugin) is NOT included — YAGNI for this
 * project. Add it when/if the org plugin is wired.
 */
export const Sessions: CollectionConfig = {
  slug: "sessions",
  admin: {
    useAsTitle: "token",
    group: "Auth (Better Auth)",
    hidden: false,
  },
  fields: [
    { name: "expiresAt", type: "date", required: true },
    { name: "token", type: "text", required: true, unique: true, index: true },
    { name: "ipAddress", type: "text" },
    { name: "userAgent", type: "text" },
    {
      name: "userId",
      type: "relationship",
      relationTo: "users",
      required: true,
      index: true,
    },
  ],
  timestamps: true,
};
