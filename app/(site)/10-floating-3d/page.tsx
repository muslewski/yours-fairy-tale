import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

export default function Floating3D() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#120829] font-[family-name:var(--font-quicksand)] text-white">
      <BackLink tone="light" />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 80% 20%, rgba(240,66,210,0.45), transparent 70%), radial-gradient(50% 40% at 10% 70%, rgba(23,199,226,0.4), transparent 70%), radial-gradient(50% 40% at 60% 90%, rgba(250,202,35,0.25), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={150}
            height={72}
            priority
            className="h-16 w-auto brightness-110"
          />
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rounded-full bg-gradient-to-r from-[#17c7e2] to-[#f042d2] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_-8px_rgba(240,66,210,0.55)] md:inline-flex"
          >
            Get started
          </a>
        </header>

        <section
          className="relative mt-16 grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]"
          style={{ perspective: "1500px" }}
        >
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-white/90 backdrop-blur">
              ✦ Personalized · Hardcover · 28 pages
            </span>
            <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-6xl font-bold leading-[1.02] tracking-tight sm:text-7xl lg:text-[88px]">
              Bring their{" "}
              <span className="bg-gradient-to-r from-[#17c7e2] via-[#faca23] to-[#f042d2] bg-clip-text text-transparent">
                imagination
              </span>{" "}
              to life.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/75 sm:text-xl">
              Yours Fairy Tale layers your child into a custom-illustrated 3D world,
              prints a hardcover keepsake, and ships it straight to bedtime.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#17c7e2] to-[#f042d2] px-7 py-4 text-base font-bold text-white shadow-[0_20px_50px_-12px_rgba(240,66,210,0.7)] transition hover:scale-[1.02]"
              >
                Build their story
                <span aria-hidden>→</span>
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/8 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Watch a sample
              </a>
            </div>

            <div className="mt-12 grid max-w-md grid-cols-3 gap-2 text-sm">
              {[
                { v: "40k+", l: "books" },
                { v: "4.9★", l: "rating" },
                { v: "2–4d", l: "shipping" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur"
                >
                  <p className="font-[family-name:var(--font-fredoka)] text-2xl font-bold">
                    {s.v}
                  </p>
                  <p className="text-xs text-white/70">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative h-[560px]">
            {/* Floating card: blue */}
            <div
              className="absolute left-2 top-0 h-56 w-44 rounded-3xl bg-gradient-to-br from-[#17c7e2] to-[#0c8aa2] p-4 shadow-[0_30px_60px_-20px_rgba(23,199,226,0.6)]"
              style={{ transform: "rotateY(-12deg) rotateX(8deg) rotateZ(-6deg)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/75">
                Custom story
              </p>
              <p className="mt-1 font-[family-name:var(--font-fredoka)] text-xl font-semibold leading-tight">
                Adventure built for them.
              </p>
              <div className="mt-3 h-1 w-10 rounded-full bg-white/60" />
            </div>

            {/* Center couple image floating */}
            <div
              className="absolute left-1/2 top-1/2 aspect-square w-[420px] -translate-x-1/2 -translate-y-1/2 animate-[float_8s_ease-in-out_infinite]"
              style={{ transform: "translate(-50%,-50%) rotateY(-6deg) rotateX(4deg)" }}
            >
              <Image
                src="/couple.png"
                alt="Fairy and dragon companions"
                fill
                priority
                sizes="420px"
                className="object-contain drop-shadow-[0_40px_60px_rgba(240,66,210,0.5)]"
              />
            </div>

            {/* Astronaut floating top-right */}
            <div
              className="absolute right-0 top-8 h-44 w-44 animate-[float_10s_ease-in-out_infinite]"
              style={{ transform: "rotateY(10deg) rotateZ(8deg)" }}
            >
              <Image
                src="/astronaut.png"
                alt="Tiny astronaut character"
                fill
                sizes="180px"
                className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
              />
            </div>

            {/* Floating card: pink */}
            <div
              className="absolute bottom-8 right-4 h-44 w-52 rounded-3xl bg-gradient-to-br from-[#f042d2] to-[#a0228a] p-4 shadow-[0_30px_60px_-20px_rgba(240,66,210,0.6)]"
              style={{ transform: "rotateY(14deg) rotateX(-6deg) rotateZ(6deg)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">
                3D portrait
              </p>
              <p className="mt-1 font-[family-name:var(--font-fredoka)] text-xl font-semibold leading-tight">
                Become a fairy-tale hero.
              </p>
              <div className="mt-3 h-1 w-10 rounded-full bg-white/60" />
            </div>

            {/* Floating card: yellow */}
            <div
              className="absolute bottom-24 left-0 h-32 w-40 rounded-3xl bg-gradient-to-br from-[#faca23] to-[#d4a200] p-4 text-[#1a1033] shadow-[0_30px_60px_-20px_rgba(250,202,35,0.6)]"
              style={{ transform: "rotateY(-14deg) rotateX(-6deg) rotateZ(-8deg)" }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1033]/75">
                Full set
              </p>
              <p className="mt-1 font-[family-name:var(--font-fredoka)] text-lg font-semibold leading-tight">
                Book + portrait, together.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
