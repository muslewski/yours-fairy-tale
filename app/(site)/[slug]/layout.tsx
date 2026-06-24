import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

/**
 * Chrome for CMS pages: the same floating nav + footer as the rest of the site.
 * Blocks supply their own full-bleed backgrounds, so <main> stays neutral
 * (no bg / padding) — matching the homepage, where the first block clears the
 * fixed nav with its own top padding.
 */
export default function CmsPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
