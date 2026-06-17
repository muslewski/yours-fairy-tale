import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

/**
 * The public /open pages get the full marketing chrome (floating nav + footer +
 * cream paper), matching /sign-in. This wraps only the page(s) under /open (the
 * expired page); the /open/<token> ROUTE HANDLER is not a page, so no layout
 * applies to it — it stays a bare redirect. Scoped here (not on the (app) group)
 * so the gated /app dashboard keeps its own chrome.
 *
 * The nav is fixed/floating; `pt-28 sm:pt-32` clears it. The footer supplies its
 * own entry wave.
 */
export default function OpenLayout({ children }: { children: React.ReactNode }) {
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
