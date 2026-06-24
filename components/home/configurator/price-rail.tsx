import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, type ReactNode } from "react";
import type { AddOn, DetailLevel, LengthTier } from "@/lib/pricing";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (m: number) => Math.round((m - 1) * 100);

function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 180, damping: 20 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span>{display}</motion.span>;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-brand-deep/75">{label}</span>
      <span className="font-black tabular-nums">{value}</span>
    </li>
  );
}

export function PriceRail(props: {
  total: number;
  totalMinutes: number;
  lvl: DetailLevel;
  tier: LengthTier;
  extraMinutes: number;
  minutesCost: number;
  chosenAddOns: AddOn[];
  surcharge: number;
  cta: ReactNode;
}) {
  const { total, totalMinutes, lvl, tier, extraMinutes, minutesCost, chosenAddOns, surcharge, cta } = props;
  return (
    <div className="rounded-b-[25px] border-t-[3px] border-brand-deep bg-brand-yellow lg:rounded-b-none lg:rounded-r-[25px] lg:border-l-[3px] lg:border-t-0">
      {/* Sticky on desktop so the running total stays in view down the tall form;
          the yellow column itself fills the grid row, so nothing empties out. */}
      <div className="p-7 sm:p-9 lg:sticky lg:top-24">
      <p className="text-xs font-black uppercase tracking-widest text-brand-deep/60">
        Their video so far
      </p>
      <div className="mt-2 flex items-end gap-2">
        <span className="font-[family-name:var(--font-fredoka)] text-7xl font-bold leading-none tabular-nums">
          $<AnimatedNumber value={total} />
        </span>
        <span className="mb-2 text-sm font-black text-brand-deep/55">USD</span>
      </div>
      <p className="mt-1 text-sm font-bold text-brand-deep/55">
        {totalMinutes} minutes · {lvl.label} detail
      </p>

      <ul className="mt-6 space-y-2 border-t-[3px] border-dashed border-brand-deep/25 pt-5 text-sm font-semibold">
        <SummaryRow label={`${tier.label} film (${tier.minutes} min)`} value={usd(tier.price)} />
        <AnimatePresence initial={false}>
          {extraMinutes > 0 && (
            <motion.div
              key="extra-min"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SummaryRow label={`+${extraMinutes} extra min`} value={`+${usd(minutesCost)}`} />
            </motion.div>
          )}
          {chosenAddOns.map((o) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SummaryRow label={o.label} value={`+${usd(o.price)}`} />
            </motion.div>
          ))}
          {surcharge > 0 && (
            <motion.div
              key="surcharge"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SummaryRow
                label={`${lvl.label} detail (+${pct(lvl.multiplier)}%)`}
                value={`+${usd(surcharge)}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </ul>

      {cta}
      </div>
    </div>
  );
}
