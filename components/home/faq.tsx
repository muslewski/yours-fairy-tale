import { AnimatedHeading } from "@/components/motion/animated-heading";

const FAQS = [
  {
    q: "How long until the book arrives?",
    a: "Most books are illustrated and shipped within two weeks, and you'll get an email at every step along the way.",
  },
  {
    q: "Can I see it before it ships?",
    a: "Yes. We send a full digital preview, and you can ask for changes before anything is printed.",
  },
  {
    q: "What ages is this made for?",
    a: "The stories are written for children from about two to eight years old, and they tend to be treasured well beyond that.",
  },
  {
    q: "How do you use my child's details?",
    a: "Only to create your book. We never sell your information, and you can ask us to delete it at any time.",
  },
  {
    q: "What if I need to change something?",
    a: "Just reply to your confirmation email. We're glad to adjust names, little details, or the dedication.",
  },
  {
    q: "Is it really personalized, or just a name swap?",
    a: "It's truly personalized. Your child's name, hair, and the details you share are illustrated into the story by a real artist.",
  },
];

export function Faq() {
  return (
    <section className="relative bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6 sm:px-10">
        <div className="text-center">
          <span className="inline-block rotate-[2deg] rounded-lg border-[3px] border-brand-deep bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
            Questions, answered
          </span>
          <AnimatedHeading
            as="h2"
            text="The little details, sorted"
            className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
        </div>

        <div className="mt-12 space-y-4">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-2xl border-[3px] border-brand-deep bg-white shadow-comic [&[open]]:shadow-comic-lg"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 font-[family-name:var(--font-fredoka)] text-lg font-semibold marker:content-none">
                {item.q}
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-[3px] border-brand-deep bg-brand-yellow text-xl font-black transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="px-6 pb-6 text-base font-medium text-brand-deep/75">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
