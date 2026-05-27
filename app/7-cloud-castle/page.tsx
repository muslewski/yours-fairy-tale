import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

function Cloud({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      aria-hidden
    >
      <ellipse cx="40" cy="80" rx="40" ry="28" fill="white" />
      <ellipse cx="90" cy="60" rx="55" ry="40" fill="white" />
      <ellipse cx="150" cy="78" rx="45" ry="30" fill="white" />
      <ellipse cx="120" cy="92" rx="60" ry="22" fill="white" />
    </svg>
  );
}

export default function CloudCastle() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#bff5fb] via-[#e6f9fc] to-[#fff9ee] font-[family-name:var(--font-quicksand)] text-[#1a1033]">
      <BackLink />

      <Cloud className="pointer-events-none absolute left-[-4%] top-[12%] h-32 w-72 opacity-90 animate-[float_10s_ease-in-out_infinite]" />
      <Cloud className="pointer-events-none absolute right-[-2%] top-[28%] h-28 w-60 opacity-80 animate-[float_12s_ease-in-out_infinite]" />
      <Cloud className="pointer-events-none absolute left-[40%] top-[6%] h-24 w-52 opacity-70 animate-[float_9s_ease-in-out_infinite]" />
      <Cloud className="pointer-events-none absolute right-[24%] bottom-[8%] h-32 w-72 opacity-90 animate-[float_11s_ease-in-out_infinite]" />
      <Cloud className="pointer-events-none absolute left-[10%] bottom-[2%] h-28 w-60 opacity-80" />

      {/* Sun */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[14%] top-[18%] h-40 w-40 rounded-full bg-[#faca23] blur-2xl opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[16%] top-[20%] h-28 w-28 rounded-full bg-[#faca23]"
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-12 pt-6 sm:px-10">
        <header className="flex items-center justify-between rounded-full bg-white/70 px-4 py-2 backdrop-blur-md">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={150}
            height={72}
            priority
            className="h-16 w-auto"
          />
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-[#1a1033]/80 transition hover:bg-white"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rounded-full bg-[#f042d2] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1a1033] md:inline-flex"
          >
            Begin →
          </a>
        </header>

        <section className="relative mt-10 flex flex-1 flex-col items-center text-center">
          <div className="relative grid w-full grid-cols-2 items-end gap-4 sm:gap-12">
            <div className="relative aspect-[4/5] w-full max-w-[280px] justify-self-end sm:max-w-[360px]">
              <Image
                src="/couple.png"
                alt="Fairy and dragon companions"
                fill
                priority
                sizes="(min-width: 1024px) 360px, 40vw"
                className="object-contain drop-shadow-[0_20px_30px_rgba(26,16,51,0.18)] animate-[float_8s_ease-in-out_infinite]"
              />
            </div>
            <div className="relative aspect-[4/5] w-full max-w-[280px] justify-self-start sm:max-w-[360px]">
              <Image
                src="/astronaut.png"
                alt="Tiny astronaut storybook character"
                fill
                priority
                sizes="(min-width: 1024px) 360px, 40vw"
                className="object-contain drop-shadow-[0_20px_30px_rgba(26,16,51,0.18)] animate-[float_10s_ease-in-out_infinite]"
              />
            </div>
          </div>

          <div className="relative z-10 mx-auto -mt-14 max-w-3xl rounded-[40px] bg-white/85 px-8 py-10 shadow-[0_30px_60px_-30px_rgba(26,16,51,0.3)] ring-1 ring-white backdrop-blur-md sm:-mt-20 sm:px-12">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#bff5fb] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-[#17c7e2]">
              ☁ Above the clouds
            </span>
            <h1 className="mt-5 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Float into a story where{" "}
              <span className="bg-gradient-to-r from-[#17c7e2] via-[#f042d2] to-[#faca23] bg-clip-text text-transparent">
                they&apos;re the hero.
              </span>
            </h1>
            <p className="mt-5 text-lg text-[#1a1033]/75">
              Yours Fairy Tale prints custom storybooks built around your child — gentle
              adventures, dreamy worlds, and a beautiful hardcover to keep.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-[#1a1033] px-7 py-3.5 text-base font-bold text-white transition hover:bg-[#f042d2]"
              >
                Create your fairy tale
                <span aria-hidden>→</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-[#faca23] px-6 py-3.5 text-base font-bold text-[#1a1033] transition hover:-translate-y-0.5"
              >
                See sample pages
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
