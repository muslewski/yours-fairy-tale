/**
 * Studio auth bridge — server-only.
 *
 * The /studio panel is staff tooling, gated by Payload's OWN auth (the
 * `admins` collection — the same login as /admin). This module is the single
 * doorway for "who is the staff member on this request":
 *
 *   - `getStudioUserFromHeaders(h)` — resolves the payload-token cookie via
 *     the Local API (`payload.auth`) and returns the user ONLY if they come
 *     from the `admins` collection. Customer (Better Auth) sessions live in a
 *     different cookie namespace and resolve to null here. Testable directly.
 *   - `getStudioUser()` — same, from the current request's headers.
 *   - `requireStudioUser()` — throws unless staff; call at the TOP of every
 *     studio mutation (mirrors assertOwnsOrder in lib/order-actions.ts).
 *
 * The pretty UI is never the security boundary — this module is.
 */
import { headers } from "next/headers";

import { getPayloadClient } from "@/lib/payload";

export interface StudioUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getStudioUserFromHeaders(
  h: Headers,
): Promise<StudioUser | null> {
  const payload = await getPayloadClient();
  const { user } = await payload.auth({ headers: h });
  // Defense-in-depth: admins is currently the ONLY auth: true collection, so
  // payload.auth can't mint anything else today — the check guards config drift.
  if (!user || user.collection !== "admins") return null;
  return {
    id: String(user.id),
    email: String(user.email),
    name: (user as { name?: string | null }).name ?? null,
  };
}

/** The staff member on the current request, or null. */
export async function getStudioUser(): Promise<StudioUser | null> {
  return getStudioUserFromHeaders(await headers());
}

/** Throws unless the current request is a signed-in staff member. */
export async function requireStudioUser(): Promise<StudioUser> {
  const user = await getStudioUser();
  if (!user) {
    throw new Error("You need to be signed in to the studio to do that.");
  }
  return user;
}
