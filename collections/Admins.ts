import type { CollectionConfig } from "payload";

/**
 * Payload's OWN admin-panel auth collection — the staff / developer login for
 * `/admin`. This is the ONLY `auth: true` collection in the project.
 *
 * WHY: `/admin` is internal tooling for the team, so it uses Payload's native
 * authentication (email + password, added automatically by `auth: true`).
 *
 * Customer-facing accounts are a SEPARATE concern and will arrive in a later
 * slice driven by Better Auth, backed by plain (non-`auth`) collections
 * (users/accounts/sessions/verifications). Do NOT add `auth: true` to those
 * customer collections, and do NOT add customer auth here.
 */
export const Admins: CollectionConfig = {
  slug: "admins",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [
    // `email` and `password` are added automatically because `auth: true`.
    { name: "name", type: "text" },
  ],
};
