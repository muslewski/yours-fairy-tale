/**
 * /app/profile — the customer's account page.
 *
 * Server component. The (app) layout already gates the session, so we trust it
 * exists and read the parent's name + email straight from it. For the MVP these
 * are read-only: a calm, on-brand card, a link back to their videos, and a
 * sign-out button. Editing comes later (YAGNI).
 *
 * Copy is parent-facing and runs through the brand-voice guide.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { getCustomerSession } from "@/lib/customer-data";
import { SignOutButton } from "@/components/app/sign-out-button";

export const metadata: Metadata = {
  title: "Your profile — Yours Fairy Tale",
};

export default async function ProfilePage() {
  const session = await getCustomerSession();
  const user = session?.user;
  const name = user?.name?.trim() || null;
  const email = user?.email ?? null;

  return (
    <main className="min-h-screen bg-brand-cream px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-4xl text-brand-deep md:text-5xl"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Your profile
            </h1>
            <p
              className="mt-2 text-lg text-brand-deep/70"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              The account that keeps your videos safe.
            </p>
          </div>
          <Link
            href="/app"
            className="mt-1 shrink-0 rounded-full border-2 border-brand-deep bg-white px-5 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            Your videos
          </Link>
        </header>

        <article className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
          <dl className="flex flex-col gap-5">
            <div>
              <dt
                className="text-sm font-semibold uppercase tracking-widest text-brand-pink"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                Name
              </dt>
              <dd
                className="mt-1 text-xl text-brand-deep"
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                {name ?? "Not set yet"}
              </dd>
            </div>
            <div>
              <dt
                className="text-sm font-semibold uppercase tracking-widest text-brand-pink"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                Email
              </dt>
              <dd
                className="mt-1 break-all text-xl text-brand-deep"
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                {email ?? "Not set yet"}
              </dd>
            </div>
          </dl>

          <p
            className="mt-6 text-sm text-brand-deep/60"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Need to change your details? Reply to any of our emails and we will
            take care of it.
          </p>
        </article>

        <div className="mt-8">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
