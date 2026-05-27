import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 20" className={className} fill="none" aria-hidden>
      <path
        d="M2 10 Q 12 0, 22 10 T 42 10 T 62 10 T 82 10 T 102 10 T 118 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2l3 7 7 .5-5.5 5 1.7 7.5L12 18.3 5.8 22l1.7-7.5L2 9.5 9 9z" />
    </svg>
  );
}

export default function StickerSheet() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff5e1] font-[family-name:var(--font-quicksand)] text-[#1a1033]">
      <BackLink />

      {/* Doodles */}
      <Squiggle className="pointer-events-none absolute left-[6%] top-[16%] h-5 w-32 text-[#f042d2] -rotate-6" />
      <Squiggle className="pointer-events-none absolute right-[8%] top-[26%] h-5 w-32 text-[#17c7e2] rotate-12" />
      <Star className="pointer-events-none absolute left-[18%] top-[8%] h-6 w-6 text-[#faca23] -rotate-12 animate-[wiggle_4s_ease-in-out_infinite]" />
      <Star className="pointer-events-none absolute right-[14%] bottom-[20%] h-8 w-8 text-[#f042d2]" />
      <Star className="pointer-events-none absolute left-[40%] bottom-[12%] h-5 w-5 text-[#17c7e2] rotate-12" />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10">
        <header className="flex items-center justify-between">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={150}
            height={72}
            priority
            className="h-20 w-auto"
          />
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item, i) => (
              <a
                key={item}
                href="#"
                className={`rounded-2xl border-2 border-dashed border-[#1a1033]/20 px-3.5 py-2 text-sm font-bold text-[#1a1033] transition hover:border-[#f042d2] hover:bg-white ${
                  i % 2 ? "rotate-1" : "-rotate-1"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rotate-2 rounded-2xl border-2 border-[#1a1033] bg-[#faca23] px-5 py-2.5 text-sm font-bold text-[#1a1033] shadow-[3px_3px_0_#1a1033] md:inline-flex"
          >
            Hi there! 👋
          </a>
        </header>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="inline-flex -rotate-3 items-center gap-2 rounded-2xl border-2 border-[#1a1033] bg-[#17c7e2] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-white shadow-[3px_3px_0_#1a1033]">
              ✷ Sticker-fresh stories
            </div>
            <h1 className="mt-7 font-[family-name:var(--font-fredoka)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="inline-block rotate-[-2deg]">Stories</span>{" "}
              <span className="inline-block">peeled</span>
              <br />
              <span className="inline-block rotate-1 bg-gradient-to-r from-[#f042d2] to-[#17c7e2] bg-clip-text text-transparent">
                straight off the page.
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[#1a1033]/75">
              Cut-out characters, doodle adventures, hand-illustrated heroes —
              Yours Fairy Tale makes every keepsake feel handmade just for your little one.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="inline-flex -rotate-1 items-center gap-2 rounded-2xl border-2 border-[#1a1033] bg-[#f042d2] px-7 py-4 text-base font-bold text-white shadow-[5px_5px_0_#1a1033] transition active:translate-y-1 active:shadow-[1px_1px_0_#1a1033]"
              >
                Stick me in a story →
              </a>
              <a
                href="#"
                className="inline-flex rotate-1 items-center gap-2 rounded-2xl border-2 border-[#1a1033] bg-white px-6 py-4 text-base font-bold text-[#1a1033] shadow-[5px_5px_0_#1a1033]"
              >
                Peek inside
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-3">
              {[
                { label: "Custom Story", c: "#17c7e2", rot: "-rotate-3" },
                { label: "3D Portrait", c: "#f042d2", rot: "rotate-2" },
                { label: "Full Set", c: "#faca23", rot: "-rotate-1" },
              ].map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-2 rounded-2xl border-2 border-[#1a1033] px-4 py-2 text-sm font-bold shadow-[3px_3px_0_#1a1033] ${b.rot}`}
                  style={{ background: b.c, color: b.c === "#faca23" ? "#1a1033" : "white" }}
                >
                  <Star className="h-4 w-4" />
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-8 rotate-3 rounded-[60%] border-4 border-dashed border-[#1a1033]/30"
            />
            <div
              aria-hidden
              className="absolute inset-14 -rotate-6 rounded-[50%] bg-gradient-to-br from-[#faca23] via-[#f042d2] to-[#17c7e2] opacity-60"
            />
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <Image
                src="/astronaut.png"
                alt="Tiny astronaut storybook character"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 90vw"
                className="object-contain drop-shadow-[6px_6px_0_rgba(26,16,51,0.85)] animate-[float_7s_ease-in-out_infinite]"
              />
            </div>

            <div className="absolute -bottom-2 -right-2 hidden -rotate-6 items-center gap-2 rounded-2xl border-2 border-[#1a1033] bg-white px-4 py-2 text-sm font-bold shadow-[4px_4px_0_#1a1033] sm:flex">
              <Star className="h-4 w-4 text-[#faca23]" />
              Made by hand
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
