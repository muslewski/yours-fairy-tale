import { AnimatedHeading } from "@/components/motion/animated-heading";

const COLLECTIONS = [
  {
    icon: "🌙",
    name: "Bedtime adventures",
    blurb: "Gentle tales that drift toward sleep, ending on a quiet, cozy note.",
    bg: "bg-brand-blue",
    rotate: "-rotate-2",
  },
  {
    icon: "🚀",
    name: "Outer space",
    blurb: "Your child explores the planets and names a brand new star of their own.",
    bg: "bg-brand-pink",
    rotate: "rotate-1",
  },
  {
    icon: "🐳",
    name: "Under the sea",
    blurb: "A deep blue world of coral reefs, whales, and one very brave little diver.",
    bg: "bg-brand-yellow",
    rotate: "-rotate-1",
  },
  {
    icon: "🦊",
    name: "Enchanted forest",
    blurb: "Talking animals, hidden paths, and a kind hero at the center of it all.",
    bg: "bg-brand-yellow",
    rotate: "rotate-2",
  },
  {
    icon: "🐉",
    name: "Dragons and castles",
    blurb: "A small knight with a big heart, and a dragon who just wants a friend.",
    bg: "bg-brand-blue",
    rotate: "-rotate-1",
  },
  {
    icon: "🎂",
    name: "Birthday surprise",
    blurb: "A story built around their big day, with the people they love along for the ride.",
    bg: "bg-brand-pink",
    rotate: "rotate-1",
  },
];

export function Categories() {
  return (
    <section id="collections" className="relative bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
        <div className="max-w-2xl">
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
            Storybook collections
          </span>
          <AnimatedHeading
            as="h2"
            text="Find the world your child belongs in"
            className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
          <p className="mt-4 text-lg font-medium text-brand-deep/75">
            Every story is personalized with your child&apos;s name and likeness. Choose the
            adventure that feels most like them.
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {COLLECTIONS.map((c) => (
            <li key={c.name} className="group">
              <a
                href="#"
                className="block h-full rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic transition-[transform,box-shadow] duration-150 group-hover:-translate-x-0.5 group-hover:-translate-y-1 group-hover:shadow-comic-lg"
              >
                <span
                  aria-hidden
                  className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-brand-deep ${c.bg} ${c.rotate} text-3xl shadow-comic-sm transition-transform duration-150 group-hover:rotate-0`}
                >
                  {c.icon}
                </span>
                <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-2xl font-semibold">
                  {c.name}
                </h3>
                <p className="mt-2 text-base font-medium text-brand-deep/70">{c.blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-brand-pink">
                  Peek inside
                  <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
