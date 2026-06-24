import type { HeroBlock } from "@/lib/pages-types";

const BG: Record<string, string> = {
  cream: "bg-brand-cream text-brand-deep",
  yellow: "bg-brand-yellow text-brand-deep",
  blue: "bg-brand-blue text-brand-deep",
  deep: "bg-brand-deep text-brand-cream",
};

export function HeroRender({ block }: { block: HeroBlock }) {
  const tone = BG[block.background ?? "cream"] ?? BG.cream;
  return (
    <section className={`px-6 py-20 text-center sm:py-28 ${tone}`}>
      <div className="mx-auto max-w-3xl">
        {block.eyebrow ? (
          <span className="inline-block rotate-[-1deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
            {block.eyebrow}
          </span>
        ) : null}
        <h1 className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
          {block.heading}
        </h1>
        {block.subcopy ? (
          <p className="mt-4 text-lg font-medium opacity-80">{block.subcopy}</p>
        ) : null}
        {Array.isArray(block.ctas) && block.ctas.length ? (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {block.ctas.map((c, i) =>
              c.link?.url ? (
                <a
                  key={c.id ?? i}
                  href={c.link.url}
                  target={c.link.newTab ? "_blank" : undefined}
                  rel={c.link.newTab ? "noopener noreferrer" : undefined}
                  className={`rounded-xl border-[3px] border-brand-deep px-6 py-3 text-sm font-black uppercase tracking-wide shadow-comic transition-shadow hover:shadow-comic-lg ${
                    c.variant === "secondary"
                      ? "bg-brand-cream text-brand-deep"
                      : "bg-brand-pink text-white"
                  }`}
                >
                  {c.link.label}
                </a>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
