"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Checkout, type CheckoutCart } from "@/components/checkout";
import { AnimatedHeading } from "@/components/motion/animated-heading";

type SegOption = { id: string; label: string; caption: string; note: string };
type LengthTier = { id: string; label: string; minutes: number; price: number; note: string };
type DetailLevel = { id: string; label: string; multiplier: number; note: string };
type AddOn = { id: string; label: string; price: number; note: string };

const LENGTHS: LengthTier[] = [
  { id: "short", label: "Short", minutes: 3, price: 300, note: "A short and sweet first story." },
  { id: "medium", label: "Medium", minutes: 5, price: 450, note: "Room for a fuller adventure." },
  { id: "long", label: "Long", minutes: 10, price: 900, note: "The full journey, start to finish." },
];

const DETAILS: DetailLevel[] = [
  { id: "basic", label: "Basic", multiplier: 1, note: "Clean, charming animation with all the essentials." },
  { id: "detailed", label: "Detailed", multiplier: 1.1, note: "Richer backgrounds and more movement in every scene." },
  { id: "premium", label: "Premium", multiplier: 1.3, note: "Our finest work, with lush detail in every frame." },
];

const ADDONS: AddOn[] = [
  { id: "narration", label: "Custom narration", price: 60, note: "A warm voice reads the story aloud." },
  { id: "music", label: "Original music", price: 40, note: "A score written to match their adventure." },
  { id: "master", label: "4K master file", price: 50, note: "A downloadable copy in the highest quality." },
];

const EXTRA_MINUTE_PRICE = 100;
const MAX_EXTRA_MINUTES = 30;

const pct = (multiplier: number) => Math.round((multiplier - 1) * 100);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

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

export function Configurator() {
  const [length, setLength] = useState("medium");
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [detail, setDetail] = useState("basic");
  const [addOns, setAddOns] = useState<string[]>(["narration"]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const tier = LENGTHS.find((o) => o.id === length)!;
  const lvl = DETAILS.find((o) => o.id === detail)!;
  const chosenAddOns = useMemo(() => ADDONS.filter((o) => addOns.includes(o.id)), [addOns]);

  const minutesCost = extraMinutes * EXTRA_MINUTE_PRICE;
  const addOnsCost = chosenAddOns.reduce((s, o) => s + o.price, 0);
  const subtotal = tier.price + minutesCost + addOnsCost;
  const surcharge = Math.round(subtotal * (lvl.multiplier - 1));
  const total = subtotal + surcharge;
  const totalMinutes = tier.minutes + extraMinutes;

  const cart: CheckoutCart = {
    currency: "usd",
    total,
    items: [
      { label: `${tier.label} film (${tier.minutes} min)`, amount: tier.price },
      ...(extraMinutes > 0 ? [{ label: `+${extraMinutes} extra min`, amount: minutesCost }] : []),
      ...chosenAddOns.map((o) => ({ label: o.label, amount: o.price })),
      ...(surcharge > 0
        ? [{ label: `${lvl.label} detail (+${pct(lvl.multiplier)}%)`, amount: surcharge }]
        : []),
    ],
  };

  const toggleAddOn = (id: string) =>
    setAddOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const lengthOptions: SegOption[] = LENGTHS.map((o) => ({
    id: o.id,
    label: o.label,
    caption: `${usd(o.price)} · ${o.minutes} min`,
    note: o.note,
  }));
  const detailOptions: SegOption[] = DETAILS.map((o) => ({
    id: o.id,
    label: o.label,
    caption: o.multiplier === 1 ? "Base price" : `+${pct(o.multiplier)}%`,
    note: o.note,
  }));

  return (
    <section
      id="build"
      className="relative overflow-hidden bg-brand-deep py-20 text-white sm:py-28"
      style={{
        backgroundImage:
          "radial-gradient(circle at 10px 10px, rgba(255,249,238,0.08) 2px, transparent 0)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="max-w-2xl">
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-white bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_#fff]">
            Build their video
          </span>
          <AnimatedHeading
            as="h2"
            text="Design their film, watch the price as you go"
            className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
          <p className="mt-4 text-lg font-medium text-white/70">
            Pick a length, add any extra minutes, and choose the level of detail. No payment yet.
            This just helps you picture their video.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="mt-12 grid overflow-hidden rounded-[28px] border-[3px] border-brand-deep bg-white text-brand-deep shadow-comic-lg lg:grid-cols-[1fr_350px]"
        >
          {/* Controls */}
          <div className="space-y-9 p-7 sm:p-9">
            <Segmented
              legend="Length"
              name="length"
              options={lengthOptions}
              selected={length}
              onSelect={setLength}
            />
            <RangeSlider
              value={extraMinutes}
              onChange={setExtraMinutes}
              max={MAX_EXTRA_MINUTES}
              totalMinutes={totalMinutes}
              cost={minutesCost}
            />
            <Segmented
              legend="Detail level"
              name="detail"
              options={detailOptions}
              selected={detail}
              onSelect={setDetail}
            />

            <fieldset>
              <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                Add-ons
              </legend>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {ADDONS.map((o) => {
                  const checked = addOns.includes(o.id);
                  return (
                    <motion.label
                      key={o.id}
                      whileTap={{ scale: 0.94 }}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-full border-[3px] border-brand-deep px-4 py-2.5 text-sm font-bold shadow-comic-sm transition-colors ${
                        checked ? "bg-brand-pink text-white" : "bg-white text-brand-deep"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleAddOn(o.id)}
                      />
                      <span
                        aria-hidden
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-[2px] text-[11px] font-black ${
                          checked ? "border-white bg-white text-brand-pink" : "border-brand-deep text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {o.label}
                      <span className="font-black">+${o.price}</span>
                    </motion.label>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={chosenAddOns.map((o) => o.id).join("-") || "none"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="mt-3 text-sm font-medium text-brand-deep/60"
                >
                  {chosenAddOns.length > 0
                    ? chosenAddOns[chosenAddOns.length - 1].note
                    : "Optional touches you can add to make it extra special."}
                </motion.p>
              </AnimatePresence>
            </fieldset>
          </div>

          {/* Summary rail */}
          <div className="border-t-[3px] border-brand-deep bg-brand-yellow p-7 sm:p-9 lg:border-l-[3px] lg:border-t-0">
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

            <motion.button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              whileHover={{ y: -2 }}
              whileTap={{ y: 1, scale: 0.99 }}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic"
            >
              Create their video →
            </motion.button>
            <p className="mt-3 text-center text-xs font-semibold text-brand-deep/60">
              No payment yet. Full preview before we animate.
            </p>
          </div>
        </motion.div>

        <Checkout open={checkoutOpen} cart={cart} onClose={() => setCheckoutOpen(false)} />
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-brand-deep/75">{label}</span>
      <span className="font-black tabular-nums">{value}</span>
    </li>
  );
}

function RangeSlider({
  value,
  onChange,
  max,
  totalMinutes,
  cost,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  totalMinutes: number;
  cost: number;
}) {
  const pctFilled = (value / max) * 100;
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
        Extra minutes
      </legend>
      <div className="mt-4 flex items-center justify-between text-sm font-bold text-brand-deep/70">
        <span>
          +{value} min · {totalMinutes} min total
        </span>
        <span className="font-black tabular-nums text-brand-deep">
          {cost > 0 ? `+${usd(cost)}` : "Included"}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Extra minutes"
        className="mt-3 h-3 w-full cursor-pointer appearance-none rounded-full border-[3px] border-brand-deep outline-none focus-visible:ring-4 focus-visible:ring-brand-pink/40 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-brand-deep [&::-moz-range-thumb]:bg-brand-pink [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-brand-deep [&::-webkit-slider-thumb]:bg-brand-pink"
        style={{
          background: `linear-gradient(to right, var(--color-brand-pink) ${pctFilled}%, var(--color-brand-cream) ${pctFilled}%)`,
        }}
      />
      <p className="mt-3 text-sm font-medium text-brand-deep/60">
        Each extra minute adds ${EXTRA_MINUTE_PRICE} to the base length.
      </p>
    </fieldset>
  );
}

function Segmented({
  legend,
  name,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  name: string;
  options: SegOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const selectedNote = options.find((o) => o.id === selected)?.note;
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
        {legend}
      </legend>
      <div className="mt-4 flex gap-1.5 rounded-2xl border-[3px] border-brand-deep bg-brand-cream p-1.5">
        {options.map((o) => {
          const active = selected === o.id;
          return (
            <label key={o.id} className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={active}
                onChange={() => onSelect(o.id)}
              />
              {active && (
                <motion.span
                  layoutId={`seg-${name}`}
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-brand-deep shadow-comic-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={`relative z-10 flex flex-col items-center px-2 py-2.5 text-center transition-colors duration-200 ${
                  active ? "text-white" : "text-brand-deep"
                }`}
              >
                <span className="text-sm font-bold leading-tight">{o.label}</span>
                <span className="mt-0.5 text-xs font-black opacity-80">{o.caption}</span>
              </span>
            </label>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="mt-3 text-sm font-medium text-brand-deep/60"
        >
          {selectedNote}
        </motion.p>
      </AnimatePresence>
    </fieldset>
  );
}
