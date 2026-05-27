import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

export default function BentoGrid() {
  return (
    <main className="min-h-screen bg-[#fff9ee] font-[family-name:var(--font-quicksand)] text-[#1a1033]">
      <BackLink />
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-6 sm:px-8">
        <header className="mb-6 flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={160}
            height={80}
            priority
            className="h-20 w-auto"
          />
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1033]/80 transition hover:bg-[#1a1033] hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rounded-xl bg-[#1a1033] px-4 py-2.5 text-sm font-bold text-white md:inline-flex"
          >
            Start ↗
          </a>
        </header>

        <div className="grid grid-cols-6 grid-rows-[auto_auto_auto] gap-3 sm:gap-4">
          {/* Headline tile */}
          <section className="col-span-6 row-span-1 rounded-3xl bg-white p-7 ring-1 ring-[#1a1033]/5 sm:p-10 lg:col-span-4 lg:row-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f042d2]">
              Personalized · Printed · Posted
            </p>
            <h1 className="mt-4 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              A storybook
              <span className="block">
                <span className="bg-gradient-to-r from-[#17c7e2] to-[#f042d2] bg-clip-text text-transparent">
                  starring
                </span>
              </span>
              your little one.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-[#1a1033]/70">
              Choose the adventure. Drop in a name, a hair colour, a favourite animal — we
              illustrate the rest and ship a hardcover that lives on the shelf for years.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1a1033] px-6 py-3.5 text-base font-bold text-white transition hover:bg-[#f042d2]"
              >
                Create your fairy tale →
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-xl bg-[#faca23] px-6 py-3.5 text-base font-bold text-[#1a1033] transition hover:-translate-y-0.5"
              >
                Browse stories
              </a>
            </div>
          </section>

          {/* Pink tile with couple */}
          <section className="relative col-span-3 row-span-2 overflow-hidden rounded-3xl bg-gradient-to-br from-[#f042d2] to-[#ff79e0] p-6 lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/80">
              Custom story
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-fredoka)] text-2xl font-semibold text-white sm:text-3xl">
              A narrative built around your child.
            </h3>
            <div className="relative mt-2 h-56 sm:h-72">
              <Image
                src="/couple.png"
                alt="Fairy and dragon companions"
                fill
                sizes="(min-width: 1024px) 33vw, 50vw"
                className="object-contain object-bottom drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]"
              />
            </div>
          </section>

          {/* Blue tile with astronaut */}
          <section className="relative col-span-3 row-span-1 overflow-hidden rounded-3xl bg-gradient-to-br from-[#17c7e2] to-[#3fe0ff] p-6 lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/85">
              Portrait
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-fredoka)] text-2xl font-semibold text-white">
              Become a 3D fairy-tale character.
            </h3>
            <div className="relative mt-1 h-40">
              <Image
                src="/astronaut.png"
                alt="Astronaut illustration"
                fill
                sizes="33vw"
                className="object-contain object-right drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
              />
            </div>
          </section>

          {/* Yellow stat */}
          <section className="col-span-3 rounded-3xl bg-[#faca23] p-6 lg:col-span-2">
            <p className="font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-none text-[#1a1033]">
              4.9
              <span className="text-2xl">★</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-[#1a1033]/75">
              Over 12,000 parent reviews
            </p>
          </section>

          {/* Mini info tiles */}
          <section className="col-span-3 rounded-3xl bg-[#1a1033] p-6 text-white lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#faca23]">
              Full set
            </p>
            <h4 className="mt-2 font-[family-name:var(--font-fredoka)] text-2xl font-semibold">
              Storybook + portrait, together.
            </h4>
            <a
              href="#"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#17c7e2]"
            >
              Explore the bundle →
            </a>
          </section>

          <section className="col-span-6 rounded-3xl bg-white p-6 ring-1 ring-[#1a1033]/5 lg:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#17c7e2]">
              Ships in 2–4 days
            </p>
            <h4 className="mt-2 font-[family-name:var(--font-fredoka)] text-2xl font-semibold">
              Hardcover · 28 pages · matte finish
            </h4>
          </section>
        </div>
      </div>
    </main>
  );
}
