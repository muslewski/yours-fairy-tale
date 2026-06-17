import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Link expired — Yours Fairy Tale",
  robots: { index: false, follow: false },
};

export default function OpenExpiredPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6">
      <div className="w-full rounded-[28px] border-[3px] border-brand-deep bg-white p-8 shadow-comic-lg sm:p-10">
        <h1 className="text-3xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          This link has expired
        </h1>
        <p className="mt-3 text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          For your security, order links work for 30 days. Sign in with the email
          you used for your order and we&apos;ll take you right back to it.
        </p>
        <Link
          href="/sign-in"
          className="mt-7 inline-flex rounded-xl border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-semibold text-brand-deep shadow-comic"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
