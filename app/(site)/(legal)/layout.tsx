import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

/**
 * Shared chrome for the legal/trust pages (privacy, terms, refund). Mirrors the
 * other content-page layouts (contact, series): fixed nav, cream main with
 * fixed-nav clearance, and the footer with its entry wave.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-brand-cream pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
