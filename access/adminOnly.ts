import type { Access } from "payload";

/**
 * Restricts access to staff only — i.e. a user authenticated via Payload's
 * native `admins` collection.
 *
 * Payload sets `req.user.collection` to the slug of whichever collection the
 * current user came from. We check for `"admins"` because:
 *   - Customer sessions (Better Auth) are NOT routed through the Payload Local
 *     API — they are validated in server components separately.
 *   - Only team members with an `admins` row should be able to read/write
 *     sensitive data (Orders, Media, etc.) via the Payload API.
 */
export const adminOnly: Access = ({ req: { user } }) =>
  Boolean(user && (user as { collection?: string }).collection === "admins");
