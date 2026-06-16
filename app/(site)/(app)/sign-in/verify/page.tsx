/**
 * /sign-in/verify — the magic-link confirmation interstitial.
 *
 * The email's "Sign in" button points here, NOT at the raw Better Auth verify
 * endpoint. This page is a plain GET that consumes NOTHING (it never calls the
 * auth API), so email scanners, link-preview bots, and antivirus proxies that
 * fetch the link can't burn the single-use token. Only a human pressing
 * "Confirm sign-in" submits the form below, which is a NATIVE form navigation
 * straight to the real verify endpoint — a full document GET whose 302 is
 * followed to /app. Link crawlers follow <a href> targets; they do not submit
 * forms, so the consuming endpoint stays out of their reach. See
 * lib/auth-confirm-url.ts for the why.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { safeRelativePath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Confirm sign-in — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default async function VerifySignInPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; callbackURL?: string }>;
}) {
  const { token, callbackURL } = await searchParams;
  const cb = safeRelativePath(callbackURL);

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
          <h1
            className="text-3xl text-brand-deep"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            This link looks incomplete
          </h1>
          <p className="mt-3 text-brand-deep/70">
            We couldn&apos;t read your sign-in link. Please request a new one and try
            again.
          </p>
          <Link
            href="/sign-in"
            className="mt-7 inline-flex rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
        <h1
          className="text-3xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Almost there
        </h1>
        <p className="mt-3 text-brand-deep/70">
          Confirm it&apos;s you to finish signing in, and we&apos;ll take you straight
          to your videos.
        </p>
        {/* Native GET form → full document navigation to the verify endpoint.
            A human submit consumes the token exactly once; scanners don't submit. */}
        <form method="GET" action="/api/auth/magic-link/verify" className="mt-7">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="callbackURL" value={cb} />
          <input type="hidden" name="errorCallbackURL" value="/sign-in/verify/error" />
          <button
            type="submit"
            className="w-full rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic transition-opacity"
          >
            Confirm sign-in
          </button>
        </form>
      </div>
    </div>
  );
}
