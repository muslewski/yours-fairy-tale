import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign-in link problem — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default function VerifyErrorPage() {
  return (
    <div className="w-full max-w-md">
      <div className="rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
        <h1
          className="text-3xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          This link has expired or was already used
        </h1>
        <p className="mt-3 text-brand-deep/70">
          Sign-in links work once and for a short time. Request a fresh one and
          we&apos;ll email it to the address you used for your order.
        </p>
        <Link
          href="/sign-in"
          className="mt-7 inline-flex rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic"
        >
          Request a new link
        </Link>
      </div>
    </div>
  );
}
