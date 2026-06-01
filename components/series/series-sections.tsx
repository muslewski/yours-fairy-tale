import { AnimatedHeading } from "@/components/motion/animated-heading";

const APP_FEATURES = [
  { icon: "📱", title: "iOS and Android", line: "A dedicated app for the devices you already watch on." },
  { icon: "✨", title: "New episodes arrive", line: "Each new chapter appears in the app as it is finished." },
  { icon: "🛬", title: "Watch offline", line: "Download episodes for the car, the plane, or quiet time." },
  { icon: "🧸", title: "Kid-safe and ad-free", line: "A calm, gentle space made only for their story." },
];

const WAYS = [
  {
    tag: "Membership",
    title: "New episodes over time",
    line: "Join and watch the story unfold, with fresh episodes added on a regular rhythm.",
    bg: "bg-brand-blue",
    text: "text-brand-deep",
  },
  {
    tag: "One-time",
    title: "Own the whole series",
    line: "Prefer it all at once? Buy the complete series and keep every episode for good.",
    bg: "bg-brand-pink",
    text: "text-white",
  },
];

const STEPS = [
  { n: "1", title: "Tell us about your child", line: "Their name, their look, the things they love. The same details that shape a single video." },
  { n: "2", title: "We produce their series", line: "Our artists animate an ongoing adventure, one episode at a time." },
  { n: "3", title: "Watch in the app", line: "Open the app together and watch new episodes as they arrive." },
];

export function SeriesSections() {
  return (
    <div className="mt-20 space-y-24 sm:mt-28 sm:space-y-32">
      {/* What it is */}
      <section>
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
          What it is
        </span>
        <AnimatedHeading
          as="h2"
          text="An ongoing adventure, with one familiar hero"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <p className="mt-5 max-w-2xl text-lg font-medium text-brand-deep/75">
          A single video is a lovely first story. The series is the whole journey: around twenty
          episodes where your child returns again and again, growing braver and kinder with each one.
          It is the show they will ask for at the end of every day.
        </p>
      </section>

      {/* A dedicated app */}
      <section>
        <span className="inline-block rotate-[2deg] rounded-lg border-[3px] border-brand-deep bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          A dedicated app
        </span>
        <AnimatedHeading
          as="h2"
          text="Their story, ready whenever they are"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {APP_FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic"
            >
              <span
                aria-hidden
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-brand-deep bg-brand-cream text-2xl shadow-comic-sm"
              >
                {f.icon}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                {f.title}
              </h3>
              <p className="mt-2 text-base font-medium text-brand-deep/70">{f.line}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Two ways to watch */}
      <section>
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-comic-sm">
          Two ways to watch
        </span>
        <AnimatedHeading
          as="h2"
          text="Choose the way that suits your family"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {WAYS.map((w) => (
            <div
              key={w.tag}
              className="rounded-[24px] border-[3px] border-brand-deep bg-white p-8 shadow-comic"
            >
              <span
                className={`inline-block rounded-full border-[3px] border-brand-deep ${w.bg} ${w.text} px-3 py-1 text-xs font-black uppercase tracking-widest shadow-comic-sm`}
              >
                {w.tag}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-2xl font-bold">
                {w.title}
              </h3>
              <p className="mt-3 text-base font-medium text-brand-deep/70">{w.line}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm font-bold text-brand-deep/55">
          Final pricing for both will be shared at launch.
        </p>
      </section>

      {/* How it works */}
      <section>
        <span className="inline-block rotate-[2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
          How it works
        </span>
        <AnimatedHeading
          as="h2"
          text="From their name to their own show"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-7 shadow-comic"
            >
              <span
                aria-hidden
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-brand-deep bg-brand-blue font-[family-name:var(--font-fredoka)] text-xl font-bold text-brand-deep shadow-comic-sm"
              >
                {s.n}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                {s.title}
              </h3>
              <p className="mt-2 text-base font-medium text-brand-deep/70">{s.line}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
