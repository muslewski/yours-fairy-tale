import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

export default function StorybookEditorial() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#fff5e1] font-[family-name:var(--font-quicksand)] text-[#1a1033]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(26,16,51,0.08) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      <BackLink />
      <div className="mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10">
        <header className="flex items-center justify-between border-b-2 border-[#1a1033]/10 pb-5">
          <div className="flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="Yours Fairy Tale"
            unoptimized
              width={160}
              height={80}
              priority
              className="h-20 w-auto"
            />
            <span className="hidden font-[family-name:var(--font-fraunces)] text-sm italic text-[#1a1033]/60 sm:inline">
              Vol. IV · Spring Edition · 2026
            </span>
          </div>
          <nav className="hidden gap-6 md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1a1033]/75 underline-offset-8 transition hover:text-[#f042d2] hover:underline"
              >
                {item}
              </a>
            ))}
          </nav>
        </header>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-12 bg-[#1a1033]" />
              <span className="text-xs font-bold uppercase tracking-[0.32em] text-[#f042d2]">
                Feature Story
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-fraunces)] text-6xl font-black leading-[0.92] tracking-[-0.02em] sm:text-7xl lg:text-[88px]">
              Once upon a{" "}
              <em className="italic text-[#f042d2]">
                <span className="bg-gradient-to-r from-[#f042d2] to-[#17c7e2] bg-clip-text text-transparent">
                  you.
                </span>
              </em>
            </h1>
            <div className="mt-8 max-w-xl">
              <p className="font-[family-name:var(--font-fraunces)] text-xl leading-[1.55] text-[#1a1033]/85 sm:text-2xl">
                <span className="float-left mr-2 mt-1 font-black text-7xl leading-none text-[#faca23]">
                  Y
                </span>
                ours Fairy Tale prints custom hardcover books where your child is the hero —
                illustrated by hand, bound with care, and ready for tonight&apos;s last page.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-5">
              <a
                href="#"
                className="group inline-flex items-center gap-3 border-b-2 border-[#1a1033] pb-1 font-[family-name:var(--font-fraunces)] text-lg font-bold text-[#1a1033] transition hover:border-[#f042d2] hover:text-[#f042d2]"
              >
                Begin the story
                <span aria-hidden className="transition group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-[#1a1033] px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-[#f042d2]"
              >
                Browse the collection
              </a>
            </div>

            <ul className="mt-12 grid grid-cols-3 gap-6 border-t-2 border-[#1a1033]/10 pt-6">
              {[
                { n: "I.", t: "Choose adventure" },
                { n: "II.", t: "Personalize hero" },
                { n: "III.", t: "Printed & shipped" },
              ].map((s) => (
                <li key={s.n}>
                  <p className="font-[family-name:var(--font-fraunces)] text-2xl font-black text-[#f042d2]">
                    {s.n}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1a1033]/75">{s.t}</p>
                </li>
              ))}
            </ul>
          </div>

          <figure className="relative">
            <div
              aria-hidden
              className="absolute inset-x-6 inset-y-10 rounded-[180px] bg-gradient-to-br from-[#faca23] via-[#f042d2] to-[#17c7e2] opacity-90"
            />
            <div className="relative mx-auto aspect-[4/5] w-full max-w-[480px]">
              <Image
                src="/couple.png"
                alt="Fairy and dragon storybook characters"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 80vw"
                className="object-contain drop-shadow-[0_24px_36px_rgba(26,16,51,0.3)]"
              />
            </div>
            <figcaption className="mt-4 text-center font-[family-name:var(--font-fraunces)] text-sm italic text-[#1a1033]/60">
              &mdash; Illustration: Eve &amp; Ember, our most-loved companions.
            </figcaption>
          </figure>
        </div>
      </div>
    </main>
  );
}
