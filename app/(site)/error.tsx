"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary for the whole app (under the root layout). Replaces
 * the raw browser "server error" page with a calm, branded fallback. The digest
 * is shown so a customer can quote it to support. Copy follows the brand voice:
 * plain, warm, reassuring — no "Oh no!".
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-brand-cream px-6 text-center font-[family-name:var(--font-quicksand)] text-brand-deep">
      <div className="w-full max-w-md rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
        <h1
          className="text-3xl font-bold leading-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Something went wrong on our end
        </h1>
        <p className="mt-4 text-brand-deep/75">
          We hit a snag loading this page. It is not you. Please try again in a moment.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={reset}
            className="w-full rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-3 text-sm font-black uppercase tracking-wide text-white shadow-comic-sm transition-transform duration-150 active:translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-blue/60 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-xl border-[3px] border-brand-deep bg-white px-6 py-3 text-sm font-black uppercase tracking-wide text-brand-deep transition-colors hover:bg-brand-yellow sm:w-auto"
          >
            Back to home
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-7 text-xs font-semibold text-brand-deep/40">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
