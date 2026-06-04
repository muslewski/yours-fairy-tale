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
import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

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

  // The gated dashboard wears the same marketing chrome as the public site. The
  // nav is in its signed-in variant ("My account" instead of "Sign in"); the
  // layout's <main> owns the cream background, the fixed-nav clearance, and the
  // footer, so each /app page renders content-only.
  return (
    <>
      <SiteNav signedIn />
      <main className="min-h-screen bg-brand-cream pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
