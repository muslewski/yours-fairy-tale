"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import { PhoneMockup } from "@/components/series/phone-mockup";

export function SeriesTeaser() {
  const reduce = useReducedMotion();

  return (
    <section
      id="series"
      className="relative overflow-hidden bg-brand-deep py-20 text-white sm:py-28"
      style={{
        backgroundImage:
          "radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--color-brand-pink) 28%, transparent), transparent 45%), radial-gradient(circle at 5% 92%, color-mix(in srgb, var(--color-brand-blue) 24%, transparent), transparent 45%)",
      }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-white bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_var(--color-brand-blue)]">
            Premium · coming soon
          </span>
          <AnimatedHeading
            as="h2"
            text="Give them a whole series, not just one story"
            className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
          <p className="mt-5 max-w-xl text-lg font-medium text-white/70">
            Their very own show: an ongoing animated adventure of around twenty episodes, with your
            child as the hero of every one. Delivered in a dedicated app for iOS and Android.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-1.5" aria-hidden>
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-brand-yellow" : "bg-white/25"}`}
              />
            ))}
            <span className="ml-2 text-xs font-bold uppercase tracking-widest text-white/50">
              ~20 episodes
            </span>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <motion.div
              whileHover={reduce ? undefined : { scale: 1.04 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
            >
              <Link
                href="/series"
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-white bg-brand-yellow px-7 py-4 text-base font-black uppercase tracking-wide text-brand-deep shadow-comic"
              >
                See what&apos;s coming →
              </Link>
            </motion.div>
            <Link
              href="/series#waitlist"
              className="text-sm font-bold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              or join the waitlist
            </Link>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/45">
            iOS · Android · final pricing at launch
          </p>
        </div>

        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, scale: 0.9, y: 24 },
                whileInView: { opacity: 1, scale: 1, y: 0 },
                viewport: { once: true, margin: "-80px" },
                transition: { type: "spring" as const, stiffness: 140, damping: 18 },
              })}
        >
          <PhoneMockup className="animate-float-slow" />
        </motion.div>
      </div>
    </section>
  );
}
