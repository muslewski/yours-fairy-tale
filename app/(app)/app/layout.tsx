/**
 * Authoritative gate for all /app/* routes.
 *
 * The proxy.ts file performs a fast, optimistic cookie-presence check. This
 * layout is the real security boundary: it calls `auth.api.getSession` which
 * validates the session token against the database. If the session is absent
 * or expired, we redirect to /sign-in unconditionally.
 *
 * All customer-area pages live under this layout — the gate fires once per
 * navigation, covering every child route. The sign-in page lives OUTSIDE this
 * route group (under app/(app)/sign-in/) so the redirect can never trap it.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCustomerSession } from "@/lib/customer-data";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCustomerSession();

  if (!session) {
    // x-pathname is set by proxy.ts; fall back gracefully if proxy didn't run
    // (e.g. during direct server-side renders without the proxy layer).
    const hdrs = await headers();
    const pathname = hdrs.get("x-pathname") ?? "/app";
    redirect(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }

  return <>{children}</>;
}
