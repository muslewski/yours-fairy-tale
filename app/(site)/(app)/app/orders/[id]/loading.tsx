/**
 * Optimistic loading skeleton for the /app/orders/[id] detail page. Mirrors the
 * real layout (back link, the order article with timeline + message, and the
 * story panel) so the page streams in without a blank flash. Pulse is disabled
 * under reduced-motion.
 */
function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-brand-deep/10 motion-reduce:animate-none ${className}`}
    />
  );
}

export default function Loading() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6">
      <Block className="h-4 w-40" />

      <article className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
        <div className="mb-6">
          <Block className="h-9 w-3/4" />
          <Block className="mt-2 h-4 w-1/3" />
        </div>

        <div className="mb-7 flex items-center gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-8 w-8 shrink-0 rounded-full" />
          ))}
        </div>

        <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
          <Block className="h-5 w-1/2 bg-brand-deep/[0.07]" />
          <Block className="mt-3 h-4 w-full bg-brand-deep/[0.07]" />
          <Block className="mt-2 h-4 w-5/6 bg-brand-deep/[0.07]" />
        </div>
      </article>

      <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
        <Block className="mb-4 h-7 w-1/3" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Photos you sent */}
      <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
        <Block className="mb-4 h-7 w-44" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      </section>

      {/* Notes */}
      <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
        <Block className="mb-4 h-7 w-28" />
        <Block className="h-16 w-full rounded-2xl" />
        <Block className="mt-3 h-10 w-2/3 rounded-2xl" />
      </section>
    </div>
  );
}
