import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 0l2.4 8.4L24 12l-9.6 3.6L12 24l-2.4-8.4L0 12l9.6-3.6L12 0z" />
    </svg>
  );
}

export default function MagicSparkle() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9ee] font-[family-name:var(--font-quicksand)] text-[#1a1033]">
      <BackLink />

      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-32 h-[480px] w-[480px] rounded-full bg-[#17c7e2] opacity-60 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-10%] h-[520px] w-[520px] rounded-full bg-[#f042d2] opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-12%] left-1/3 h-[480px] w-[480px] rounded-full bg-[#faca23] opacity-50 blur-3xl"
      />

      <Sparkle className="pointer-events-none absolute left-[12%] top-[22%] h-6 w-6 text-[#faca23] animate-[float_5s_ease-in-out_infinite]" />
      <Sparkle className="pointer-events-none absolute right-[18%] top-[14%] h-4 w-4 text-[#f042d2] animate-[float_7s_ease-in-out_infinite]" />
      <Sparkle className="pointer-events-none absolute left-[40%] bottom-[14%] h-5 w-5 text-[#17c7e2] animate-[float_6s_ease-in-out_infinite]" />
      <Sparkle className="pointer-events-none absolute right-[8%] bottom-[28%] h-7 w-7 text-[#faca23]/80 animate-[float_8s_ease-in-out_infinite]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={180}
            height={96}
            priority
            className="h-16 w-auto sm:h-20"
          />
          <nav className="hidden rounded-full border border-white/60 bg-white/70 px-2 py-2 shadow-[0_8px_30px_-12px_rgba(26,16,51,0.25)] backdrop-blur md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#1a1033]/80 transition hover:bg-[#1a1033] hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rounded-full bg-[#1a1033] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#1a1033]/20 transition hover:bg-[#f042d2] md:inline-flex"
          >
            Start your tale
          </a>
        </header>

        <div className="mt-14 grid flex-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#1a1033]/10 bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#f042d2] backdrop-blur">
              <Sparkle className="h-3 w-3" />
              Made just for your little one
            </span>
            <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Where{" "}
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-r from-[#17c7e2] via-[#f042d2] to-[#faca23] bg-clip-text text-transparent">
                  every child
                </span>
                <span
                  aria-hidden
                  className="absolute -inset-x-1 bottom-1 -z-0 h-3 rounded-full bg-[#faca23]/40 blur-sm"
                />
              </span>{" "}
              becomes the hero of their story.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[#1a1033]/75 sm:text-xl">
              Yours Fairy Tale weaves your child&apos;s name, looks, and dreams into a
              beautifully illustrated keepsake — printed, bound, and ready to read tonight.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#17c7e2] via-[#f042d2] to-[#faca23] px-7 py-4 text-base font-bold text-white shadow-[0_18px_40px_-10px_rgba(240,66,210,0.55)] transition hover:scale-[1.02] active:scale-[0.99]"
              >
                Create your fairy tale
                <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full bg-white/80 px-6 py-4 text-base font-semibold text-[#1a1033] ring-1 ring-[#1a1033]/10 backdrop-blur transition hover:bg-white"
              >
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-[#1a1033] text-white"
                >
                  ▶
                </span>
                Watch how it works
              </a>
            </div>

            <dl className="mt-10 flex flex-wrap gap-8">
              {[
                { v: "40k+", l: "books printed" },
                { v: "4.9★", l: "parent rating" },
                { v: "2–4d", l: "delivery" },
              ].map((s) => (
                <div key={s.l}>
                  <dt className="font-[family-name:var(--font-fredoka)] text-3xl font-bold text-[#1a1033]">
                    {s.v}
                  </dt>
                  <dd className="text-sm text-[#1a1033]/60">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 mx-auto h-[420px] w-[420px] translate-y-6 rounded-full bg-gradient-to-br from-[#17c7e2] via-[#f042d2] to-[#faca23] opacity-70 blur-3xl"
            />
            <div className="relative mx-auto aspect-square w-full max-w-[560px]">
              <Image
                src="/couple.png"
                alt="Fairy and dragon storybook characters"
                fill
                priority
                sizes="(min-width: 1024px) 560px, 90vw"
                className="object-contain drop-shadow-[0_30px_40px_rgba(26,16,51,0.25)] animate-[float_8s_ease-in-out_infinite]"
              />
            </div>

            <div className="absolute left-2 top-12 hidden rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-xl backdrop-blur sm:block">
              <p className="font-bold text-[#f042d2]">✨ Personalized</p>
              <p className="text-[#1a1033]/70">Name · age · hair · eyes</p>
            </div>
            <div className="absolute bottom-10 right-0 hidden rounded-2xl bg-white/85 px-4 py-3 text-sm shadow-xl backdrop-blur sm:block">
              <p className="font-bold text-[#17c7e2]">📖 Printed hardcover</p>
              <p className="text-[#1a1033]/70">28 magical pages</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
