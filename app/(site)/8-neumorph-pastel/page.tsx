import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

const SOFT_OUT =
  "shadow-[12px_12px_28px_rgba(190,170,210,0.45),-12px_-12px_28px_rgba(255,255,255,0.95)]";
const SOFT_IN =
  "shadow-[inset_6px_6px_14px_rgba(190,170,210,0.3),inset_-6px_-6px_14px_rgba(255,255,255,0.9)]";

export default function NeumorphPastel() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f6efff] font-[family-name:var(--font-quicksand)] text-[#3b1d6e]">
      <BackLink />

      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-20 h-[420px] w-[420px] rounded-full bg-[#bff5fb] opacity-50 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 bottom-10 h-[420px] w-[420px] rounded-full bg-[#fde2f7] opacity-60 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10">
        <header
          className={`flex items-center justify-between rounded-full bg-[#f6efff] px-4 py-2.5 ${SOFT_OUT}`}
        >
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
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#3b1d6e]/80 transition hover:text-[#f042d2]"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className={`hidden rounded-full bg-[#f6efff] px-5 py-2.5 text-sm font-bold text-[#3b1d6e] ${SOFT_OUT} transition active:${SOFT_IN} md:inline-flex`}
          >
            Sign in
          </a>
        </header>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div
              className={`inline-flex items-center gap-2 rounded-full bg-[#f6efff] px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#f042d2] ${SOFT_IN}`}
            >
              ♡ Calm bedtime stories
            </div>
            <h1 className="mt-7 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Soft stories.
              <br />
              <span className="text-[#f042d2]">Big dreams.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-[#3b1d6e]/75">
              Yours Fairy Tale crafts gentle, beautifully illustrated keepsake books
              starring your little one — perfect for a quiet, magical bedtime.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#17c7e2] to-[#f042d2] px-7 py-4 text-base font-bold text-white shadow-[8px_8px_20px_rgba(240,66,210,0.3),-6px_-6px_16px_rgba(255,255,255,0.9)] transition hover:scale-[1.02]`}
              >
                Create your fairy tale
                <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-2 rounded-full bg-[#f6efff] px-6 py-4 text-base font-bold text-[#3b1d6e] ${SOFT_OUT}`}
              >
                Listen to a sample
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { v: "28", l: "pages" },
                { v: "3+", l: "ages" },
                { v: "♥", l: "for tonight" },
              ].map((s) => (
                <div
                  key={s.l}
                  className={`rounded-3xl bg-[#f6efff] p-5 text-center ${SOFT_OUT}`}
                >
                  <p className="font-[family-name:var(--font-fredoka)] text-3xl font-bold text-[#17c7e2]">
                    {s.v}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#3b1d6e]/70">
                    {s.l}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              className={`relative mx-auto flex aspect-square w-full max-w-[520px] items-center justify-center rounded-[140px_60px_140px_60px] bg-[#f6efff] ${SOFT_OUT}`}
            >
              <div className="absolute inset-8 rounded-[110px_40px_110px_40px] bg-gradient-to-br from-[#fde2f7] via-[#f6efff] to-[#cdf3fa]" />
              <Image
                src="/couple.png"
                alt="Fairy and dragon companions"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 90vw"
                className="object-contain p-10 drop-shadow-[0_20px_30px_rgba(59,29,110,0.25)] animate-[float_8s_ease-in-out_infinite]"
              />
            </div>
            <div
              className={`absolute -left-2 bottom-10 hidden rounded-2xl bg-[#f6efff] px-5 py-3 ${SOFT_OUT} sm:block`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-[#17c7e2]">
                Quiet · Cozy · Custom
              </p>
              <p className="text-sm font-semibold text-[#3b1d6e]/80">
                Personalised for tonight
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
