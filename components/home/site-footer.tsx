"use client";

import Image from "next/image";
import { Stagger, StaggerItem, hoverPop, tapPop } from "@/components/motion/stagger";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "Collections", href: "/#collections" },
      { label: "How it works", href: "/#build" },
      { label: "The Series", href: "/series" },
      { label: "The Journal", href: "/blog" },
      { label: "Pricing", href: "/#build" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/#faq" },
      { label: "Contact us", href: "/#top" },
      { label: "Delivery", href: "/#faq" },
      { label: "Track your order", href: "/#top" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/#top" },
      { label: "Reviews", href: "/#top" },
      { label: "Gift cards", href: "/#build" },
      { label: "Careers", href: "/#top" },
    ],
  },
];

const SOCIALS = ["Instagram", "TikTok", "Pinterest"];

export function SiteFooter() {
  return (
    <footer className="bg-brand-deep px-6 pb-10 pt-16 text-white sm:px-10 sm:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          {/* Brand + newsletter */}
          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl border-[3px] border-white bg-white px-4 py-2 shadow-[4px_4px_0_var(--color-brand-pink)]">
              <Image
                src="/logo.png"
                alt="Yours Fairy Tale"
                unoptimized
                width={120}
                height={120}
                className="h-9 w-9"
              />
              <span className="font-[family-name:var(--font-fredoka)] text-lg font-bold text-brand-deep">
                Yours Fairy Tale
              </span>
            </div>
            <p className="mt-5 max-w-sm text-base font-medium text-white/70">
              Hand-animated fairy tales starring your child. Written with care, animated by a real
              artist, and made to be watched again and again.
            </p>

            <form className="mt-7 max-w-sm">
              <label
                htmlFor="footer-email"
                className="text-sm font-black uppercase tracking-widest text-brand-yellow"
              >
                A little note now and then
              </label>
              <div className="mt-3 flex gap-2">
                <input
                  id="footer-email"
                  type="email"
                  placeholder="you@email.com"
                  className="w-full rounded-xl border-[3px] border-white bg-white px-4 py-3 text-sm font-semibold text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-4 focus:ring-brand-pink/50"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-xl border-[3px] border-white bg-brand-pink px-5 py-3 text-sm font-black uppercase text-white transition-transform duration-150 active:translate-y-0.5"
                >
                  Join
                </button>
              </div>
              <p className="mt-2 text-xs font-semibold text-white/45">
                Occasional updates and new collections. No spam, ever.
              </p>
            </form>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="font-[family-name:var(--font-fredoka)] text-base font-bold uppercase tracking-wide text-brand-yellow">
                  {col.title}
                </h3>
                <Stagger as="ul" trigger="view" className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <StaggerItem
                      key={link.label}
                      as="li"
                      style={{ transformOrigin: "left" }}
                      whileHover={{ scale: 1.08 }}
                    >
                      <a
                        href={link.href}
                        className="text-sm font-semibold text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </a>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-5 border-t-[3px] border-dashed border-white/20 pt-7 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-white/55">
            © 2026 Yours Fairy Tale. Made by hand, with love.
          </p>
          <Stagger trigger="view" className="flex flex-wrap items-center gap-2">
            {SOCIALS.map((s) => (
              <StaggerItem
                key={s}
                as="a"
                href="#"
                whileHover={hoverPop}
                whileTap={tapPop}
                className="rounded-lg border-[3px] border-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70 transition-colors hover:border-white hover:text-white"
              >
                {s}
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </footer>
  );
}
