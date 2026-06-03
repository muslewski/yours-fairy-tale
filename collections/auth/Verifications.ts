import type { CollectionConfig } from "payload";

/**
 * Better Auth `verification` model, as a Payload-managed collection.
 *
 * Stores single-use verification values (email verification, password reset,
 * etc). Field names mirror BA's authoritative `verification` schema.
 *
 * NOTE: `auth: true` is intentionally NOT set. BA owns credentials.
 */
export const Verifications: CollectionConfig = {
  slug: "verifications",
  admin: {
    useAsTitle: "identifier",
    group: "Auth (Better Auth)",
    hidden: false,
  },
  fields: [
    { name: "identifier", type: "text", required: true, index: true },
    { name: "value", type: "text", required: true },
    { name: "expiresAt", type: "date", required: true },
  ],
  timestamps: true,
};
