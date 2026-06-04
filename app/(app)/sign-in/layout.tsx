import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

/**
 * Sign-in gets the full marketing chrome (floating nav + footer) like the rest
 * of the public site. Scoped to /sign-in only — the gated /app dashboard (also
 * in this route group) deliberately has its own chrome and must NOT inherit
 * this, so the layout lives here rather than on the (app) group.
 *
 * The nav is fixed/floating; `pt-28 sm:pt-32` clears it. The footer supplies its
 * own entry wave.
 */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-cream px-6 pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
