import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

export default function AuroraMesh() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0c0820] font-[family-name:var(--font-quicksand)] text-white">
      <BackLink tone="light" />

      {/* Mesh layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 20% 10%, rgba(23,199,226,0.65) 0%, transparent 60%), radial-gradient(60% 50% at 90% 20%, rgba(240,66,210,0.7) 0%, transparent 60%), radial-gradient(70% 60% at 50% 95%, rgba(250,202,35,0.45) 0%, transparent 65%), radial-gradient(50% 40% at 85% 90%, rgba(23,199,226,0.55) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "conic-gradient(from 220deg at 70% 50%, rgba(240,66,210,0.3), rgba(23,199,226,0.25), rgba(250,202,35,0.25), rgba(240,66,210,0.3))",
          filter: "blur(60px)",
          opacity: 0.55,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#0c0820]/30"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-6 sm:px-10">
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
          <nav className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-full px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/15"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#1a1033] transition hover:bg-[#faca23] md:inline-flex"
          >
            Get started
          </a>
        </header>

        <section className="relative mx-auto mt-16 flex w-full max-w-4xl flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-white/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#faca23]" />
            Personalized children&apos;s books
          </span>

          <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-6xl font-bold leading-[1.02] tracking-tight sm:text-7xl lg:text-[96px]">
            Tonight&apos;s bedtime
            <br />
            <span className="bg-gradient-to-r from-[#17c7e2] via-[#faca23] to-[#f042d2] bg-clip-text text-transparent">
              becomes an adventure.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg text-white/80 sm:text-xl">
            Yours Fairy Tale builds custom-illustrated storybooks around your child&apos;s
            name, looks, and dreams — and ships a hardcover keepsake worth re-reading.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[#1a1033] transition hover:bg-[#faca23]"
            >
              Create your fairy tale
              <span aria-hidden className="transition group-hover:translate-x-1">→</span>
            </a>
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
            >
              <span aria-hidden>▶</span>
              90-second preview
            </a>
          </div>

          <div className="relative mt-16 w-full">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[640px]">
              <Image
                src="/astronaut.png"
                alt="Tiny astronaut storybook character"
                fill
                priority
                sizes="(min-width: 1024px) 640px, 90vw"
                className="object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.45)] animate-[float_8s_ease-in-out_infinite]"
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/80">
              {["40k+ books printed", "4.9★ rated by parents", "Ships worldwide"].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#17c7e2]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
