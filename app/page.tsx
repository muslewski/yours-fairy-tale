import Link from "next/link";
import Image from "next/image";
import { VARIANTS } from "@/lib/variants";

export default function Gallery() {
  return (
    <main className="min-h-screen bg-[#fff9ee] text-[#1a1033]">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <header className="flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="Yours Fairy Tale"
            unoptimized
            width={220}
            height={120}
            priority
            className="h-auto w-44 sm:w-56"
          />
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-[#f042d2]">
            Hero Concepts
          </p>
          <h1 className="font-[family-name:var(--font-fredoka)] text-4xl leading-tight font-bold sm:text-5xl md:text-6xl">
            Ten ways to open the storybook
          </h1>
          <p className="mt-5 max-w-2xl text-base text-[#1a1033]/70 sm:text-lg">
            Pick a style. Each route is a fully designed hero section that uses the
            same brand palette, illustrations, and content — interpreted ten different ways.
          </p>
        </header>

        <ul className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VARIANTS.map((v, i) => (
            <li key={v.slug}>
              <Link
                href={`/${v.slug}`}
                className="group relative block overflow-hidden rounded-3xl border border-[#1a1033]/10 bg-white p-6 shadow-[0_2px_0_rgba(26,16,51,0.08)] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(240,66,210,0.45)]"
              >
                <div
                  className={`aspect-[16/9] w-full overflow-hidden rounded-2xl bg-gradient-to-br ${v.swatch}`}
                  aria-hidden
                />
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17c7e2]">
                      {String(i + 1).padStart(2, "0")} · {v.tag}
                    </p>
                    <h2 className="mt-1 font-[family-name:var(--font-fredoka)] text-2xl font-semibold">
                      {v.name}
                    </h2>
                  </div>
                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a1033] text-white transition group-hover:bg-[#f042d2]"
                  >
                    →
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#1a1033]/70">{v.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
