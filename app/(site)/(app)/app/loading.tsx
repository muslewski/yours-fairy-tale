/**
 * Optimistic loading skeleton for the /app dashboard. Streamed instantly via
 * Suspense while getOrdersForCurrentCustomer resolves, so the page never flashes
 * blank. Mirrors the real layout: the static header renders for real; the order
 * cards are placeholder blocks. The pulse is disabled under reduced-motion.
 */
function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-brand-deep/10 motion-reduce:animate-none ${className}`}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="w-full">
          <Block className="h-7 w-2/3" />
          <Block className="mt-2 h-4 w-1/3" />
        </div>
        <Block className="h-4 w-24 shrink-0" />
      </div>
      <div className="mb-6 flex items-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Block key={i} className="h-8 w-8 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
        <Block className="h-5 w-1/2 bg-brand-deep/[0.07]" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-6">
      <header className="mb-10">
        <h1
          className="text-4xl text-brand-deep md:text-5xl"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Your videos
        </h1>
        <p
          className="mt-2 text-lg text-brand-deep/70"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Follow every step as we bring their story to life.
        </p>
      </header>

      <ul className="flex flex-col gap-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <li key={i}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
