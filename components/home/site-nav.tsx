"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Stagger, StaggerItem, hoverPop, tapPop } from "@/components/motion/stagger";
import { authClient } from "@/lib/auth-client";

/** Next.js <Link> with motion props — client-side navigation, no full page reload. */
const MotionLink = motion.create(Link);

const NAV = [
  { label: "Home", href: "/#top" },
  { label: "Fairy Tale", href: "/#collections" },
  { label: "Series", href: "/series" },
  { label: "Journal", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/**
 * Fixed floating navigation. The outer wrapper is pointer-events-none so the
 * transparent gutters never block hovering the hero behind it; only the pill
 * itself is interactive.
 *
 * Auth state: public pages (homepage, series, blog, contact, sign-in) are static,
 * so the nav resolves "signed in?" CLIENT-side via Better Auth's `useSession()` —
 * a signed-in visitor sees "My account" instead of "Sign in" without making those
 * pages dynamic. Routes that already KNOW the state (the `/app` gate) pass the
 * `signedIn` prop to override the hook, so there's no first-paint flash there.
 */
export function SiteNav({ signedIn: signedInProp }: { signedIn?: boolean } = {}) {
  const reduce = useReducedMotion();
  const { data: session } = authClient.useSession();
  // Explicit prop wins (gated routes); otherwise derive from the client session.
  const signedIn = signedInProp ?? Boolean(session?.user);
  const [menuOpen, setMenuOpen] = useState(false);

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
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex items-center justify-center rounded-lg border-[3px] border-brand-deep bg-white p-2 text-brand-deep shadow-comic-sm md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>

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

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="pointer-events-auto fixed inset-0 z-50 flex flex-col bg-brand-cream px-6 py-6 md:hidden"
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="inline-flex items-center justify-center rounded-lg border-[3px] border-brand-deep bg-white p-2 text-brand-deep shadow-comic-sm"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-2">
              {NAV.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-lg font-bold text-brand-deep hover:bg-brand-yellow"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={signedIn ? "/app/profile" : "/sign-in"}
                onClick={() => setMenuOpen(false)}
                className="mt-2 rounded-xl border-[3px] border-brand-deep bg-white px-4 py-3 text-lg font-bold text-brand-deep shadow-comic-sm"
              >
                {signedIn ? "My account" : "Sign in"}
              </Link>
              <Link
                href="/#build"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border-[3px] border-brand-deep bg-brand-pink px-4 py-3 text-lg font-bold text-white shadow-comic-sm"
              >
                Start
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
