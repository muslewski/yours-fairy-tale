"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { authClient } from "@/lib/auth-client";

/**
 * Public post-checkout confirmation. Deliberately auth- and DB-free: Stripe
 * redirects here immediately after payment, but the order is created by the
 * async webhook a moment later, so this page must NOT depend on the order (or a
 * session) existing yet. It reassures, sets email expectations (incl. spam), and
 * routes the parent onward. The signed-in vs signed-out CTA is resolved
 * client-side via Better Auth, exactly like the nav.
 *
 * Phase 3 will additionally clear the configurator draft on mount (the draft
 * does not exist yet).
 */
export default function OrderConfirmedPage() {
  const reduce = useReducedMotion();
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(session?.user);

  return (
    <section className="mx-auto max-w-2xl px-6 text-center sm:px-10">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          Order confirmed
        </span>
        <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
          Your order is confirmed
        </h1>
        <p className="mt-5 text-lg font-medium text-brand-deep/70">
          We&apos;ve emailed you a confirmation with a link to track your
          video&apos;s progress. It can take a minute or two to arrive.
        </p>
        <p className="mt-3 text-sm font-semibold text-brand-deep/55">
          Don&apos;t see it? Check your spam or promotions folder.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={signedIn ? "/app" : "/sign-in"}
            className="inline-flex items-center justify-center rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic active:translate-y-1 active:shadow-comic-sm"
          >
            {signedIn ? "Go to your orders" : "Sign in to track your order"}
          </Link>
          <Link
            href="/#build"
            className="inline-flex items-center justify-center rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic active:translate-y-1 active:shadow-comic-sm"
          >
            Create another
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
