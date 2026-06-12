import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

export default function GlassDream() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0f0a26] font-[family-name:var(--font-quicksand)] text-white">
      <BackLink tone="light" />

      {/* Aurora blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-[-10%] h-[640px] w-[640px] rounded-full bg-[#17c7e2] opacity-60 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[10%] h-[680px] w-[680px] rounded-full bg-[#f042d2] opacity-60 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-20%] left-1/3 h-[640px] w-[640px] rounded-full bg-[#faca23] opacity-40 blur-[140px]"
      />

      {/* Grid noise overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-16 pt-6 sm:px-10">
        <header className="rounded-2xl border border-white/15 bg-white/8 px-3 py-2.5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
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
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                >
                  {item}
                </a>
              ))}
            </nav>
            <a
              href="#"
              className="hidden rounded-xl border border-white/30 bg-white/15 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/25 md:inline-flex"
            >
              Sign in
            </a>
          </div>
        </header>

        <div className="mt-14 grid flex-1 items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white/90 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#faca23]" />
              New · 2026 Bedtime Collection
            </span>
            <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Stories as
              <br />
              <span className="bg-gradient-to-r from-[#17c7e2] via-[#faca23] to-[#f042d2] bg-clip-text text-transparent">
                magical as they are.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75 sm:text-xl">
              Custom-illustrated, beautifully printed, and built around the little human you
              love. Yours Fairy Tale turns bedtime into a starring role.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/15 px-7 py-4 text-base font-bold text-white backdrop-blur-xl transition hover:bg-white/25"
              >
                Start your story
                <span aria-hidden>→</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#17c7e2] to-[#f042d2] px-7 py-4 text-base font-bold text-white shadow-[0_20px_40px_-12px_rgba(240,66,210,0.55)] transition hover:scale-[1.02]"
              >
                See samples
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-3">
              {[
                { k: "Custom Story", c: "#17c7e2" },
                { k: "3D Portrait", c: "#f042d2" },
                { k: "Full Set", c: "#faca23" },
              ].map((p) => (
                <div
                  key={p.k}
                  className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-xl"
                >
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: p.c }}
                  >
                    {p.k}
                  </span>
                  <p className="text-sm text-white/80">From €29</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-[600px]">
              <div
                aria-hidden
                className="absolute inset-6 rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-gradient-to-br from-white/20 to-white/0 backdrop-blur-2xl"
              />
              <Image
                src="/couple.png"
                alt="Fairy and dragon storybook characters"
                fill
                priority
                sizes="(min-width: 1024px) 600px, 90vw"
                className="object-contain drop-shadow-[0_30px_50px_rgba(0,0,0,0.45)] animate-[float_8s_ease-in-out_infinite]"
              />
            </div>

            <div className="absolute -left-2 top-10 hidden rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-sm text-white backdrop-blur-xl sm:block">
              <p className="font-bold">✦ Hand-illustrated</p>
              <p className="text-white/70">Original art for every order</p>
            </div>
            <div className="absolute -right-2 bottom-12 hidden rounded-2xl border border-white/20 bg-white/12 px-4 py-3 text-sm text-white backdrop-blur-xl sm:block">
              <p className="font-bold">⌁ Ships worldwide</p>
              <p className="text-white/70">Tracked · 2–4 day delivery</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
