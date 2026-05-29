export function CtaBanner() {
  return (
    <section className="bg-brand-cream px-6 py-16 sm:px-10 sm:py-24">
      <div
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] border-[4px] border-brand-deep bg-brand-pink px-8 py-16 text-center shadow-comic-lg sm:px-16 sm:py-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10px 10px, rgba(26,16,51,0.16) 2px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      >
        {/* floating stickers */}
        <span
          aria-hidden
          className="absolute -left-3 top-8 hidden rotate-[-12deg] rounded-2xl border-[3px] border-brand-deep bg-brand-yellow px-4 py-2 text-sm font-black uppercase shadow-comic-sm sm:block"
        >
          ✦ Handmade
        </span>
        <span
          aria-hidden
          className="absolute -right-2 bottom-10 hidden rotate-[10deg] rounded-2xl border-[3px] border-brand-deep bg-brand-blue px-4 py-2 text-sm font-black uppercase text-brand-deep shadow-comic-sm sm:block"
        >
          Ships in 2 weeks
        </span>

        <h2 className="font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
          Ready to make
          <br />
          their story?
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg font-semibold text-white/90">
          Add their name, choose an adventure, and we&apos;ll handcraft the rest. A keepsake they&apos;ll
          ask for again and again.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-yellow px-7 py-4 text-base font-black uppercase tracking-wide text-brand-deep shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Create your book →
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            See sample books
          </a>
        </div>
      </div>
    </section>
  );
}
