"use client";

import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "motion/react";
import DotField from "@/components/DotField";
import { Stagger, StaggerItem, hoverPop, tapPop } from "@/components/motion/stagger";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

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
    <section className="relative min-h-screen overflow-hidden bg-brand-yellow">
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

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10">
        <header className="flex items-center justify-between gap-4 rounded-2xl border-[3px] border-brand-deep bg-white px-5 py-2.5 shadow-comic">
          <motion.div
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.5, rotate: -12 },
                  animate: { opacity: 1, scale: 1, rotate: 0 },
                  transition: { type: "spring", stiffness: 260, damping: 14, delay: 0.05 },
                })}
          >
            <Image
              src="/logo.png"
              alt="Yours Fairy Tale"
              unoptimized
              width={120}
              height={120}
              priority
              className="h-12 w-12 shrink-0"
            />
          </motion.div>

          <Stagger as="nav" trigger="mount" className="hidden flex-1 justify-center gap-1 md:flex">
            {NAV.map((item) => (
              <StaggerItem
                key={item}
                as="a"
                href="#"
                whileHover={reduce ? undefined : hoverPop}
                whileTap={reduce ? undefined : tapPop}
                className="rounded-lg px-3.5 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-yellow"
              >
                {item}
              </StaggerItem>
            ))}
          </Stagger>

          <motion.a
            href="#build"
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.5, rotate: 10 },
                  animate: { opacity: 1, scale: 1, rotate: 0 },
                  transition: { type: "spring", stiffness: 260, damping: 14, delay: 0.1 },
                  whileHover: { scale: 1.06, rotate: -2 },
                  whileTap: { scale: 0.95 },
                })}
            className="shrink-0 rounded-lg border-[3px] border-brand-deep bg-brand-pink px-4 py-2 text-sm font-bold text-white shadow-comic-sm active:translate-y-0.5"
          >
            Start! ⚡
          </motion.a>
        </header>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <motion.div
              {...rise(0.05)}
              className="inline-block rotate-[-3deg] rounded-xl border-[3px] border-brand-deep bg-white px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_var(--color-brand-deep)]"
            >
              ⭐ Brand new!
            </motion.div>

            {reduce ? (
              <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-[88px]">
                <span className="block whitespace-nowrap">Pow! A</span>
                <span
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  Storybook
                </span>
                <span className="block whitespace-nowrap">just for YOU!</span>
              </h1>
            ) : (
              <motion.h1
                variants={headlineContainer}
                initial="hidden"
                animate="show"
                className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl xl:text-[88px]"
              >
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  Pow! A
                </motion.span>
                <motion.span
                  variants={headlineLine}
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  Storybook
                </motion.span>
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  just for YOU!
                </motion.span>
              </motion.h1>
            )}

            <motion.div {...rise(0.24)} className="relative mt-6 inline-block max-w-xl">
              <div className="relative rounded-2xl border-[3px] border-brand-deep bg-white p-5 text-lg font-semibold shadow-comic">
                Drop in their name, hair colour, favourite animal — KAPOW! a hand-illustrated
                hardcover starring your little legend lands at your door.
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
                Make my book →
              </motion.a>
              <motion.a
                href="#collections"
                whileHover={reduce ? undefined : { scale: 1.04 }}
                whileTap={reduce ? undefined : { scale: 0.97 }}
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic active:translate-y-1 active:shadow-comic-sm"
              >
                See samples
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
              <span>40,000+ tiny heroes already starring</span>
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
              BOOM!
            </div>
            <div
              aria-hidden
              className="absolute -bottom-2 -left-4 -rotate-6 rounded-2xl border-[3px] border-brand-deep bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_var(--color-brand-deep)]"
            >
              ✦ Hand-drawn
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <Image
                src="/astronaut.png"
                alt="Tiny astronaut storybook character"
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
