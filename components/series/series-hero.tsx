import Link from "next/link";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import { PhoneMockup } from "@/components/series/phone-mockup";

export function SeriesHero() {
  return (
    <header className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-comic-sm">
          Premium · coming soon
        </span>
        <AnimatedHeading
          as="h1"
          text="Their very own show, made just for them"
          className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-xl text-lg font-medium text-brand-deep/75">
          A personalized animated series of around twenty episodes, with your child as the hero of an
          ongoing adventure. It lives in a dedicated app for iOS and Android, ready whenever it is
          time to watch.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-yellow px-7 py-4 text-base font-black uppercase tracking-wide text-brand-deep shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Join the waitlist →
          </Link>
          <Link
            href="/#build"
            className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Start with one video
          </Link>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-brand-deep/45">
          iOS · Android · final pricing at launch
        </p>
      </div>
      <PhoneMockup className="animate-float-slow" />
    </header>
  );
}
