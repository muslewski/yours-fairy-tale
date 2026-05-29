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

type Option = { id: string; label: string; price: number; note: string };

const FORMATS: Option[] = [
  { id: "softcover", label: "Softcover", price: 29, note: "Light and bendy, great for little hands." },
  { id: "hardcover", label: "Hardcover", price: 49, note: "A sturdy cover that holds up to bedtime after bedtime." },
  { id: "deluxe", label: "Deluxe keepsake", price: 69, note: "Linen cover, gilded edges, and a slipcase." },
];

const LENGTHS: Option[] = [
  { id: "short", label: "12 pages", price: 0, note: "A short and sweet first story." },
  { id: "standard", label: "24 pages", price: 10, note: "Room for a fuller adventure." },
  { id: "long", label: "32 pages", price: 20, note: "The full journey, start to finish." },
];

const EXTRAS: Option[] = [
  { id: "dedication", label: "Personal dedication", price: 5, note: "A short note from you on the first page." },
  { id: "giftwrap", label: "Gift wrapping", price: 8, note: "Wrapped by hand and ready to give." },
  { id: "print", label: "Matching art print", price: 15, note: "A frame-ready print of the cover scene." },
];

function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toString());
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
  const [format, setFormat] = useState("hardcover");
  const [length, setLength] = useState("standard");
  const [extras, setExtras] = useState<string[]>(["dedication"]);

  const fmt = FORMATS.find((o) => o.id === format)!;
  const len = LENGTHS.find((o) => o.id === length)!;
  const chosenExtras = useMemo(() => EXTRAS.filter((o) => extras.includes(o.id)), [extras]);
  const total = fmt.price + len.price + chosenExtras.reduce((s, o) => s + o.price, 0);

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

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
            Build their book
          </span>
          <h2 className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl">
            Design the keepsake, watch the price as you go
          </h2>
          <p className="mt-4 text-lg font-medium text-white/70">
            Pick a cover, a length, and any finishing touches. No payment yet. This just helps you
            picture your book.
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
              legend="Cover"
              name="format"
              options={FORMATS}
              selected={format}
              onSelect={setFormat}
            />
            <Segmented
              legend="Length"
              name="length"
              options={LENGTHS}
              selected={length}
              onSelect={setLength}
            />

            <fieldset>
              <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                Finishing touches
              </legend>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {EXTRAS.map((o) => {
                  const checked = extras.includes(o.id);
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
                        onChange={() => toggleExtra(o.id)}
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
                  key={chosenExtras.map((o) => o.id).join("-") || "none"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="mt-3 text-sm font-medium text-brand-deep/60"
                >
                  {chosenExtras.length > 0
                    ? chosenExtras[chosenExtras.length - 1].note
                    : "Optional touches you can add to make it extra special."}
                </motion.p>
              </AnimatePresence>
            </fieldset>
          </div>

          {/* Summary rail */}
          <div className="border-t-[3px] border-brand-deep bg-brand-yellow p-7 sm:p-9 lg:border-l-[3px] lg:border-t-0">
            <p className="text-xs font-black uppercase tracking-widest text-brand-deep/60">
              Your book so far
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-[family-name:var(--font-fredoka)] text-7xl font-bold leading-none tabular-nums">
                $<AnimatedNumber value={total} />
              </span>
              <span className="mb-2 text-sm font-black text-brand-deep/55">USD</span>
            </div>

            <ul className="mt-6 space-y-2 border-t-[3px] border-dashed border-brand-deep/25 pt-5 text-sm font-semibold">
              <SummaryRow label={fmt.label} price={fmt.price} />
              <SummaryRow label={len.label} price={len.price} />
              <AnimatePresence initial={false}>
                {chosenExtras.map((o) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <SummaryRow label={o.label} price={o.price} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </ul>

            <motion.a
              href="#"
              whileHover={{ y: -2 }}
              whileTap={{ y: 1, scale: 0.99 }}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic"
            >
              Create your book →
            </motion.a>
            <p className="mt-3 text-center text-xs font-semibold text-brand-deep/60">
              Free shipping. Full preview before anything prints.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function SummaryRow({ label, price }: { label: string; price: number }) {
  return (
    <li className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-brand-deep/75">{label}</span>
      <span className="font-black tabular-nums">{price === 0 ? "Included" : `+$${price}`}</span>
    </li>
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
  options: Option[];
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
                <span className="mt-0.5 text-xs font-black opacity-80">
                  {o.price === 0 ? "Included" : `+$${o.price}`}
                </span>
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
