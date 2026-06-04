"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Reset scroll to the very top on every route change.
 *
 * Why this exists: `html { scroll-behavior: smooth }` (globals.css, for in-page
 * anchor links) makes the App Router's scroll-to-top animate on navigation, and
 * the animation gets cut off by the route swap — so navigating from a scrolled
 * page to e.g. /sign-in lands a few dozen pixels down instead of at the top.
 *
 * Forcing `behavior: "instant"` overrides the smooth CSS for this one call, so
 * route changes land exactly at the top. Hash navigations (e.g. "/#build") are
 * skipped so their smooth scroll-to-anchor still works.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return; // let anchor links scroll to their target
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
