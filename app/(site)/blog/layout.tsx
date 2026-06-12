import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-brand-cream pb-20 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
