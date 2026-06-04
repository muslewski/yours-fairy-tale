"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Stagger, StaggerItem, hoverPop, tapPop } from "@/components/motion/stagger";

/** Next.js <Link> with motion props — client-side navigation, no full page reload. */
const MotionLink = motion.create(Link);

const NAV = [
  { label: "Home", href: "/#top" },
  { label: "Matieniatus", href: "/#top" },
  { label: "Fairy Tale", href: "/#collections" },
  { label: "Series", href: "/series" },
  { label: "Journal", href: "/blog" },
  { label: "Contact", href: "/#top" },
];

/**
 * Fixed floating navigation. The outer wrapper is pointer-events-none so the
 * transparent gutters never block hovering the hero behind it; only the pill
 * itself is interactive.
 */
export function SiteNav({ signedIn = false }: { signedIn?: boolean } = {}) {
  const reduce = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4 sm:px-6">
      <motion.header
        {...(reduce
          ? {}
          : {
              initial: { y: -90, opacity: 0 },
              animate: { y: 0, opacity: 1 },
              transition: { type: "spring", stiffness: 200, damping: 20 },
            })}
        className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border-[3px] border-brand-deep bg-white px-5 py-2.5 shadow-comic"
      >
        <MotionLink
          href="/#top"
          aria-label="Yours Fairy Tale — home"
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, scale: 0.5, rotate: -12 },
                animate: { opacity: 1, scale: 1, rotate: 0 },
                transition: { type: "spring", stiffness: 260, damping: 14, delay: 0.15 },
                whileHover: { rotate: -8, scale: 1.05 },
                whileTap: { scale: 0.95 },
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
        </MotionLink>

        <Stagger as="nav" trigger="mount" className="hidden flex-1 justify-center gap-1 md:flex">
          {NAV.map((item) => (
            <StaggerItem
              key={item.label}
              as="link"
              href={item.href}
              whileHover={reduce ? undefined : hoverPop}
              whileTap={reduce ? undefined : tapPop}
              className="rounded-lg px-3.5 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-yellow"
            >
              {item.label}
            </StaggerItem>
          ))}
        </Stagger>

        <div className="flex shrink-0 items-center gap-2">
          {/* Signed-in customers (/app) see "My account" → /app/profile (which
              holds sign-out); public visitors see "Sign in" → /sign-in. */}
          <MotionLink
            href={signedIn ? "/app/profile" : "/sign-in"}
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.5, rotate: -8 },
                  animate: { opacity: 1, scale: 1, rotate: 0 },
                  transition: { type: "spring", stiffness: 260, damping: 14, delay: 0.18 },
                  whileHover: { scale: 1.06, rotate: 2 },
                  whileTap: { scale: 0.95 },
                })}
            className="inline-flex rounded-lg border-[3px] border-brand-deep bg-white px-3 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-colors hover:bg-brand-yellow active:translate-y-0.5 sm:px-4"
          >
            {signedIn ? "My account" : "Sign in"}
          </MotionLink>

          <MotionLink
            href="/#build"
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0, scale: 0.5, rotate: 10 },
                  animate: { opacity: 1, scale: 1, rotate: 0 },
                  transition: { type: "spring", stiffness: 260, damping: 14, delay: 0.2 },
                  whileHover: { scale: 1.06, rotate: -2 },
                  whileTap: { scale: 0.95 },
                })}
            className="rounded-lg border-[3px] border-brand-deep bg-brand-pink px-4 py-2 text-sm font-bold text-white shadow-comic-sm active:translate-y-0.5"
          >
            Start! ⚡
          </MotionLink>
        </div>
      </motion.header>
    </div>
  );
}
