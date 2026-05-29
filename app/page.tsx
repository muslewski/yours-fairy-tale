import { SiteNav } from "@/components/home/site-nav";
import { Hero } from "@/components/home/hero";
import { Categories } from "@/components/home/categories";
import { Configurator } from "@/components/home/configurator";
import { Faq } from "@/components/home/faq";
import { CtaBanner } from "@/components/home/cta-banner";
import { SiteFooter } from "@/components/home/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        <Hero />
        <Categories />
        <Configurator />
        <Faq />
        <CtaBanner />
      </main>

      <SiteFooter />
    </>
  );
}
