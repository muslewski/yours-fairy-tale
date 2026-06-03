/**
 * Better Auth route handler.
 *
 * Mounts at /api/auth/* — OUTSIDE the (payload) route group so it does not
 * conflict with Payload's own /api/[...slug] handler. Next.js resolves this
 * specific prefix (/api/auth/*) before the Payload catch-all.
 *
 * Reference: delieta src/app/api/auth/[...all]/route.ts
 */
import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
