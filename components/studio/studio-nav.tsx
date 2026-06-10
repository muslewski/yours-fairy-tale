/**
 * StudioNav — the floating pill across the top of every gated studio page.
 * Server component; the sign-out button is the only client island.
 * External links (Stripe) open in a new tab and say so for assistive tech.
 */
import Link from "next/link";

import { SignOutButton } from "@/components/studio/sign-out-button";

export function StudioNav({ email }: { email: string }) {
  return (
    <nav
      aria-label="Studio"
      className="mb-10 flex flex-wrap items-center justify-between gap-3 rounded-full border-2 border-brand-deep bg-white px-5 py-2.5 shadow-comic"
    >
      <Link
        href="/studio"
        className="text-lg text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        Yours Fairy Tale <span className="text-brand-pink">· studio</span>
      </Link>
      <div
        className="flex flex-wrap items-center gap-4 text-sm font-bold"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        <Link href="/studio" className="underline-offset-4 hover:underline">
          Dashboard
        </Link>
        <Link href="/studio/orders" className="underline-offset-4 hover:underline">
          Orders
        </Link>
        <a
          href="https://dashboard.stripe.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Stripe dashboard (opens in a new tab)"
          className="underline-offset-4 hover:underline"
        >
          Stripe ↗
        </a>
        <a
          href="/admin"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Payload admin (opens in a new tab)"
          className="underline-offset-4 hover:underline"
        >
          Admin ↗
        </a>
        <span className="hidden text-brand-deep/50 sm:inline" title={email}>
          {email}
        </span>
        <SignOutButton />
      </div>
    </nav>
  );
}
