import { SiteNav } from "@/components/home/site-nav";
import { Hero } from "@/components/home/hero";
import { Sample } from "@/components/home/sample";
import { Categories } from "@/components/home/categories";
import { Configurator } from "@/components/home/configurator";
import { SeriesTeaser } from "@/components/home/series-teaser";
import { Faq } from "@/components/home/faq";
import { CtaBanner } from "@/components/home/cta-banner";
import { SiteFooter } from "@/components/home/site-footer";
import { SectionWave } from "@/components/home/section-wave";
import { getPricing } from "@/lib/pricing-source";

export default async function Home() {
  const pricing = await getPricing();
  return (
    <>
      <SiteNav />
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        <Hero />
        <SectionWave from="yellow" to="cream" />
        <Sample />
        <Categories />
        <SectionWave from="cream" to="deep" flip />
        <Configurator pricing={pricing} />
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
