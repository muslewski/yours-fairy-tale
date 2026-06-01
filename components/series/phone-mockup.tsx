type Props = { className?: string };

/**
 * Decorative phone frame showing "the app" — a series episode with a play
 * button and an episode strip. Purely visual (aria-hidden). Callers can add
 * `animate-float-slow` for a gentle drift (CSS, auto-disabled under
 * prefers-reduced-motion).
 */
export function PhoneMockup({ className = "" }: Props) {
  return (
    <div className={`relative mx-auto w-[230px] sm:w-[260px] ${className}`} aria-hidden>
      <div className="relative rounded-[2.5rem] border-[4px] border-brand-deep bg-brand-deep p-2.5 shadow-comic-lg">
        {/* speaker notch */}
        <div className="absolute left-1/2 top-3 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/40" />
        {/* screen */}
        <div className="overflow-hidden rounded-[2rem] bg-brand-cream">
          {/* hero scene */}
          <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-brand-blue via-brand-pink to-brand-yellow">
            <span className="absolute left-3 top-3 rounded-full border-[2px] border-brand-deep bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-deep">
              S1 · E1
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-brand-deep bg-white shadow-comic-sm">
              <span className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-brand-deep" />
            </span>
          </div>
          {/* episode strip */}
          <div className="space-y-2 p-3">
            <div className="h-2.5 w-2/3 rounded-full bg-brand-deep/15" />
            <div className="h-2.5 w-1/2 rounded-full bg-brand-deep/10" />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border-[2px] border-brand-deep/15 bg-brand-deep/5"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
