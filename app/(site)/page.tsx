import { SiteNav } from "@/components/home/site-nav";
import { Hero } from "@/components/home/hero";
import { Categories } from "@/components/home/categories";
import { Configurator } from "@/components/home/configurator";
import { SeriesTeaser } from "@/components/home/series-teaser";
import { Faq } from "@/components/home/faq";
import { CtaBanner } from "@/components/home/cta-banner";
import { SiteFooter } from "@/components/home/site-footer";
import { SectionWave } from "@/components/home/section-wave";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        <Hero />
        <SectionWave from="yellow" to="cream" />
        <Categories />
        <SectionWave from="cream" to="deep" flip />
        <Configurator />
        <SectionWave from="deep" to="yellow" />
        <SeriesTeaser />
        <SectionWave from="yellow" to="cream" flip />
        <Faq />
        <CtaBanner />
      </main>

      <SiteFooter />
    </>
  );
}
