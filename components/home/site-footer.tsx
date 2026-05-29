import Image from "next/image";

const COLUMNS = [
  {
    title: "Explore",
    links: ["Collections", "How it works", "Sample books", "Pricing"],
  },
  {
    title: "Support",
    links: ["FAQ", "Contact us", "Shipping", "Track your order"],
  },
  {
    title: "Company",
    links: ["Our story", "Reviews", "Gift cards", "Careers"],
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
              Handmade storybooks starring your child. Written with care, illustrated by a real
              artist, and made to be read again and again.
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
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm font-semibold text-white/70 transition hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-5 border-t-[3px] border-dashed border-white/20 pt-7 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-white/55">
            © 2026 Yours Fairy Tale. Made by hand, with love.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {SOCIALS.map((s) => (
              <a
                key={s}
                href="#"
                className="rounded-lg border-[3px] border-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70 transition hover:border-white hover:text-white"
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
