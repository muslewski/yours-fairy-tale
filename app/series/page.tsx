import type { Metadata } from "next";
import { SeriesHero } from "@/components/series/series-hero";
import { SeriesSections } from "@/components/series/series-sections";
import { WaitlistForm } from "@/components/series/waitlist-form";

export const metadata: Metadata = {
  title: "The Series — Yours Fairy Tale",
  description:
    "A personalized animated series starring your child, delivered in a dedicated app for iOS and Android. Coming soon. Join the waitlist.",
};

export default function SeriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-10">
      <SeriesHero />
      <SeriesSections />

      {/* Waitlist */}
      <section id="waitlist" className="mt-24 sm:mt-32">
        <div className="rounded-[28px] border-[3px] border-brand-deep bg-brand-yellow p-8 shadow-comic-lg sm:p-12">
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
            Coming soon
          </span>
          <h2 className="mt-6 max-w-2xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl">
            Be the first to know when the series opens
          </h2>
          <p className="mt-4 max-w-xl text-base font-medium text-brand-deep/75">
            Leave your email and we will let you know the moment your child can star in their own
            show. No spam, just one gentle note at launch.
          </p>
          <div className="mt-7 max-w-xl">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </div>
  );
}
