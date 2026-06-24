import type { CTABlock } from "@/lib/pages-types";

const BG: Record<string, string> = {
  yellow: "bg-brand-yellow text-brand-deep",
  pink: "bg-brand-pink text-white",
  blue: "bg-brand-blue text-brand-deep",
  deep: "bg-brand-deep text-brand-cream",
};

export function CTARender({ block }: { block: CTABlock }) {
  const tone = BG[block.background ?? "yellow"] ?? BG.yellow;
  return (
    <section className={`px-6 py-16 text-center ${tone}`}>
      <div className="mx-auto max-w-2xl">
        <h2 className="font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          {block.heading}
        </h2>
        {block.subcopy ? (
          <p className="mt-4 text-lg font-medium opacity-80">{block.subcopy}</p>
        ) : null}
        {Array.isArray(block.buttons) && block.buttons.length ? (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {block.buttons.map((b, i) =>
              b.link?.url ? (
                <a
                  key={b.id ?? i}
                  href={b.link.url}
                  target={b.link.newTab ? "_blank" : undefined}
                  rel={b.link.newTab ? "noopener noreferrer" : undefined}
                  className="rounded-xl border-[3px] border-brand-deep bg-brand-cream px-6 py-3 text-sm font-black uppercase tracking-wide text-brand-deep shadow-comic transition-shadow hover:shadow-comic-lg"
                >
                  {b.link.label}
                </a>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
