/**
 * Next.js 16 Proxy (the renamed Middleware) — an OPTIMISTIC gate over /app/*.
 *
 * Checks only for the PRESENCE of the Better Auth session cookie (no DB
 * round-trip). This is NOT the security boundary — a stale/expired cookie
 * passes here and is caught by app/(app)/app/layout.tsx's authoritative
 * getSession call. The Next 16 docs explicitly endorse Proxy for exactly this
 * ("optimistic checks, not a full session management or authorization
 * solution").
 *
 * The decision logic is extracted into `shouldRedirectToSignIn` so it can be
 * unit-tested without any Next.js server context.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Pure decision helper — returns true when the request has NO Better Auth
 * session cookie and therefore should be redirected to /sign-in.
 *
 * Extracted for unit-testability: a pure function with no side-effects.
 */
export function shouldRedirectToSignIn(request: NextRequest): boolean {
  const sessionToken = getSessionCookie(request);
  return !sessionToken;
}

export function proxy(request: NextRequest) {
  if (shouldRedirectToSignIn(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Forward x-pathname so the authoritative layout can use it for its own
  // redirect if the session turns out to be stale.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/app/:path*"] };
