import Image from "next/image";
import { BackLink } from "@/components/back-link";

const NAV = ["Home", "Matieniatus", "Fairy Tale", "Resources", "Contact"];

export default function PopComic() {
  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#faca23] font-[family-name:var(--font-quicksand)] text-[#1a1033]"
      style={{
        backgroundImage:
          "radial-gradient(circle at 10px 10px, rgba(26,16,51,0.18) 2px, transparent 0)",
        backgroundSize: "26px 26px",
      }}
    >
      <BackLink />

      <div className="relative mx-auto max-w-7xl px-6 pb-16 pt-6 sm:px-10">
        <header className="flex items-center justify-between rounded-2xl border-[3px] border-[#1a1033] bg-white px-4 py-3 shadow-[6px_6px_0_#1a1033]">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={140}
            height={72}
            priority
            className="h-16 w-auto"
          />
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href="#"
                className="rounded-lg px-3.5 py-2 text-sm font-bold text-[#1a1033] transition hover:bg-[#faca23]"
              >
                {item}
              </a>
            ))}
          </nav>
          <a
            href="#"
            className="hidden rounded-lg border-[3px] border-[#1a1033] bg-[#f042d2] px-4 py-2 text-sm font-bold text-white shadow-[3px_3px_0_#1a1033] transition active:translate-y-0.5 active:shadow-[1px_1px_0_#1a1033] md:inline-flex"
          >
            Start! ⚡
          </a>
        </header>

        <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="inline-block rotate-[-3deg] rounded-xl border-[3px] border-[#1a1033] bg-white px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_#1a1033]">
              ⭐ Brand new!
            </div>
            <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-6xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-[104px]">
              <span className="block">Pow!</span>
              <span className="block text-[#f042d2]" style={{ WebkitTextStroke: "2px #1a1033" }}>
                A storybook
              </span>
              <span className="block">just for YOU!</span>
            </h1>
            <div className="relative mt-6 inline-block max-w-xl">
              <div className="relative rounded-2xl border-[3px] border-[#1a1033] bg-white p-5 text-lg font-semibold shadow-[6px_6px_0_#1a1033]">
                Drop in their name, hair colour, favourite animal — KAPOW! a hand-illustrated
                hardcover starring your little legend lands at your door.
                <span
                  aria-hidden
                  className="absolute -bottom-4 left-10 h-0 w-0 border-l-[20px] border-r-[10px] border-t-[20px] border-l-transparent border-r-transparent border-t-white"
                />
                <span
                  aria-hidden
                  className="absolute -bottom-[18px] left-[36px] h-0 w-0 border-l-[24px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-[#1a1033]"
                />
              </div>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-[#1a1033] bg-[#17c7e2] px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-[6px_6px_0_#1a1033] transition active:translate-y-1 active:shadow-[2px_2px_0_#1a1033]"
              >
                Make my book →
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-[#1a1033] bg-white px-6 py-4 text-base font-bold text-[#1a1033] shadow-[6px_6px_0_#1a1033] transition active:translate-y-1 active:shadow-[2px_2px_0_#1a1033]"
              >
                See samples
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4 text-sm font-bold">
              <div className="flex -space-x-2">
                {["#17c7e2", "#f042d2", "#faca23", "#1a1033"].map((c) => (
                  <span
                    key={c}
                    className="inline-block h-9 w-9 rounded-full border-[3px] border-[#1a1033]"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <span>40,000+ tiny heroes already starring</span>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-6 rotate-3 rounded-[40px] border-[4px] border-[#1a1033] bg-[#f042d2] shadow-[10px_10px_0_#1a1033]"
            />
            <div
              aria-hidden
              className="absolute -top-6 -right-4 rotate-[14deg] rounded-2xl border-[3px] border-[#1a1033] bg-[#17c7e2] px-5 py-3 text-base font-black uppercase shadow-[4px_4px_0_#1a1033]"
            >
              BOOM!
            </div>
            <div
              aria-hidden
              className="absolute -bottom-2 -left-4 -rotate-6 rounded-2xl border-[3px] border-[#1a1033] bg-white px-4 py-2 text-sm font-black uppercase shadow-[4px_4px_0_#1a1033]"
            >
              ✦ Hand-drawn
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[520px]">
              <Image
                src="/astronaut.png"
                alt="Tiny astronaut storybook character"
                fill
                priority
                sizes="(min-width: 1024px) 520px, 90vw"
                className="object-contain drop-shadow-[6px_6px_0_rgba(26,16,51,1)] animate-[float_6s_ease-in-out_infinite]"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
