"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "motion/react";
import DotField from "@/components/DotField";

const headlineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } },
};
const headlineLine: Variants = {
  hidden: { opacity: 0, y: 36, rotate: -4 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: { type: "spring", stiffness: 200, damping: 12, mass: 0.9 },
  },
};

export function Hero() {
  const reduce = useReducedMotion();

  // Springy entrance helper (no-op under reduced motion).
  const rise = (delay = 0) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { type: "spring" as const, stiffness: 240, damping: 16, mass: 0.8, delay },
        };

  return (
    <section id="top" className="relative min-h-screen overflow-hidden bg-brand-yellow">
      {/* Interactive halftone background. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <DotField
          dotRadius={4}
          dotSpacing={22}
          bulgeOnly
          bulgeStrength={60}
          cursorRadius={320}
          glowColor="transparent"
          gradientFrom="rgba(26, 16, 51, 0.18)"
          gradientTo="rgba(26, 16, 51, 0.18)"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-28 sm:px-10 sm:pt-32">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <motion.div
              {...rise(0.05)}
              className="inline-block rotate-[-3deg] rounded-xl border-[3px] border-brand-deep bg-white px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_var(--color-brand-deep)]"
            >
              ⭐ Brand new
            </motion.div>

            {reduce ? (
              <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-[88px]">
                <span className="block whitespace-nowrap">An animated</span>
                <span
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  fairy tale
                </span>
                <span className="block whitespace-nowrap">made for them</span>
              </h1>
            ) : (
              <motion.h1
                variants={headlineContainer}
                initial="hidden"
                animate="show"
                className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-[88px]"
              >
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  An animated
                </motion.span>
                <motion.span
                  variants={headlineLine}
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  fairy tale
                </motion.span>
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  made for them
                </motion.span>
              </motion.h1>
            )}

            <motion.div {...rise(0.24)} className="relative mt-6 inline-block max-w-xl">
              <div className="relative rounded-2xl border-[3px] border-brand-deep bg-white p-5 text-lg font-semibold shadow-comic">
                Tell us their name, their curls, their favorite animal. We hand-animate a short
                fairy tale starring your child, ready to watch at home.
                <span
                  aria-hidden
                  className="absolute -bottom-4 left-10 h-0 w-0 border-l-[20px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-white"
                />
                <span
                  aria-hidden
                  className="absolute -bottom-[18px] left-[36px] h-0 w-0 border-l-[24px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-brand-deep"
                />
              </div>
            </motion.div>

            <motion.div {...rise(0.32)} className="mt-10 flex flex-wrap items-center gap-4">
              <motion.a
                href="#build"
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-blue px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic active:translate-y-1 active:shadow-comic-sm"
              >
                Create their video →
              </motion.a>
              <motion.a
                href="#collections"
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic active:translate-y-1 active:shadow-comic-sm"
              >
                Watch a sample
              </motion.a>
            </motion.div>

            <motion.div {...rise(0.4)} className="mt-8 flex items-center gap-4 text-sm font-bold">
              <div className="flex -space-x-2">
                {[
                  "var(--color-brand-blue)",
                  "var(--color-brand-pink)",
                  "var(--color-brand-yellow)",
                  "var(--color-brand-deep)",
                ].map((c) => (
                  <span
                    key={c}
                    className="inline-block h-9 w-9 rounded-full border-[3px] border-brand-deep"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <span>40,000+ children already starring</span>
            </motion.div>
          </div>

          <motion.div
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.85, y: 20 },
                  animate: { opacity: 1, scale: 1, y: 0 },
                  transition: { type: "spring", stiffness: 160, damping: 16, mass: 0.9, delay: 0.2 },
                })}
            className="relative"
          >
            <div
              aria-hidden
              className="absolute inset-6 rotate-3 rounded-[40px] border-[4px] border-brand-deep bg-brand-pink shadow-comic-lg"
            />
            <div
              aria-hidden
              className="absolute -top-6 -right-4 rotate-[14deg] rounded-2xl border-[3px] border-brand-deep bg-brand-blue px-5 py-3 text-base font-black uppercase shadow-[4px_4px_0_var(--color-brand-deep)]"
            >
              In 4K
            </div>
            <div
              aria-hidden
              className="absolute -bottom-2 -left-4 -rotate-6 rounded-2xl border-[3px] border-brand-deep bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_var(--color-brand-deep)]"
            >
              ✦ Hand-animated
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <Image
                src="/astronaut.png"
                alt="Hand-animated astronaut character"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 90vw"
                className="object-contain drop-shadow-[6px_6px_0_var(--color-brand-deep)] animate-[float_6s_ease-in-out_infinite]"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
