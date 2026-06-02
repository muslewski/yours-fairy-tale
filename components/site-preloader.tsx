"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Preloader from "@/components/react-bits/preloader";

/**
 * First-visit-per-session site preloader for Yours Fairy Tale.
 *
 * SSR-visible by default: the overlay is rendered in the visible state so it
 * covers page content from the very first paint — no flash of content before
 * the splash appears. On client mount the gate decides whether to keep playing
 * or dismiss immediately (already-played this session / reduced motion / crawler).
 *
 * Scope is whole-site, once-per-session: a single global sessionStorage key,
 * not keyed on pathname, so it plays on whatever page the user first lands on
 * and then stays out of the way for the rest of the session.
 */

const STORAGE_KEY = "yft-preloader";
const DEFAULT_DURATION_MS = 1800;
const CRAWLER_RE = /Googlebot|bingbot|YandexBot|DuckDuckBot|Slurp|Baiduspider/i;

export type SitePreloaderProps = {
  /** Short tagline under the logo. Keep it warm and brief — it fades quickly. */
  loadingText?: string;
  /** Splash duration in ms before the curtain parts. */
  duration?: number;
};

export function SitePreloader({
  loadingText = "A story made just for them.",
  duration = DEFAULT_DURATION_MS,
}: SitePreloaderProps) {
  // Default state: VISIBLE so SSR renders the overlay over the page.
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reduced-motion users skip entirely — no splash, no fade, no flash.
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(false);
      return;
    }

    // Known search-engine crawlers skip.
    if (
      typeof navigator !== "undefined" &&
      CRAWLER_RE.test(navigator.userAgent)
    ) {
      setVisible(false);
      return;
    }

    // Whole-site, once-per-session gate (single global key). This runs only in
    // the browser (it's inside an effect in a client component), so
    // sessionStorage is always available here.
    if (sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, "1");

    const t = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!visible) return null;

  return (
    <>
      <Preloader
        loading={loading}
        variant="curtain"
        position="fixed"
        duration={duration}
        // Our overlay renders the logo + tagline; suppress the Preloader's own
        // text so the two never collide in the center.
        loadingText=""
        respectReducedMotion
        reducedMotionFallback="fade"
        ariaLabel="Loading Yours Fairy Tale"
        bgColor="var(--color-brand-cream)"
        zIndex={9999}
        onComplete={() => setVisible(false)}
        // `motion-reduce:hidden` hides the splash at the CSS layer (before first
        // paint) so reduced-motion users never see a flash of the cream overlay,
        // even in the SSR HTML before hydration. The effect above also unmounts
        // it on the client — this is belt-and-suspenders, and the flash-proof one.
        className="!h-auto motion-reduce:hidden"
      />

      {/* Brand stack: logo + tagline, centered. AnimatePresence syncs the exit
          with the curtain parting so they leave together. */}
      <AnimatePresence>
        {loading && (
          <motion.div
            key="preloader-brand"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-0 z-[10000] flex items-center justify-center px-6 motion-reduce:hidden"
            aria-hidden="true"
          >
            <div className="flex flex-col items-center gap-5 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* alt="" — decorative; the tagline + labeled status region carry the meaning */}
                <Image
                  src="/logo.png"
                  alt=""
                  width={260}
                  height={260}
                  priority
                  className="h-28 w-auto select-none sm:h-36"
                />
              </motion.div>
              {loadingText && (
                <span className="font-[family-name:var(--font-fraunces)] text-lg italic text-brand-deep/70 sm:text-xl">
                  {loadingText}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
