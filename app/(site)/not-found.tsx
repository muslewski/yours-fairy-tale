import type { Metadata } from "next";
import Link from "next/link";

import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

export const metadata: Metadata = {
  title: "Page not found — Yours Fairy Tale",
};

/**
 * Branded 404 for the public site. Wears the full chrome (nav + footer) so a
 * lost visitor can navigate back. Copy is calm and helpful, per the brand voice.
 */
export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="flex min-h-screen flex-col items-center justify-center bg-brand-cream px-6 pb-24 pt-28 text-center font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        <div className="w-full max-w-md rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
          <p className="text-sm font-black uppercase tracking-widest text-brand-pink">
            Page not found
          </p>
          <h1
            className="mt-3 text-3xl font-bold leading-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            We couldn&apos;t find that page
          </h1>
          <p className="mt-4 text-brand-deep/75">
            The page you are looking for is not here. It may have moved, or the link
            might be off.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="w-full rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-comic-sm transition-transform duration-150 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/60 sm:w-auto"
            >
              Back to home
            </Link>
            <Link
              href="/#collections"
              className="w-full rounded-xl border-[3px] border-brand-deep bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-brand-deep transition-colors hover:bg-brand-yellow sm:w-auto"
            >
              See sample videos
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
