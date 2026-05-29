"use client";

import { useMemo, useState } from "react";

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

function PriceTag({ price }: { price: number }) {
  return (
    <span className="font-[family-name:var(--font-fredoka)] tabular-nums">
      ${price}
    </span>
  );
}

export function Configurator() {
  const [format, setFormat] = useState("hardcover");
  const [length, setLength] = useState("standard");
  const [extras, setExtras] = useState<string[]>(["dedication"]);

  const total = useMemo(() => {
    const f = FORMATS.find((o) => o.id === format)?.price ?? 0;
    const l = LENGTHS.find((o) => o.id === length)?.price ?? 0;
    const e = EXTRAS.filter((o) => extras.includes(o.id)).reduce((s, o) => s + o.price, 0);
    return f + l + e;
  }, [format, length, extras]);

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <section
      className="relative overflow-hidden bg-brand-deep py-20 text-white sm:py-28"
      style={{
        backgroundImage:
          "radial-gradient(circle at 10px 10px, rgba(255,249,238,0.08) 2px, transparent 0)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-10">
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

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Controls */}
          <div className="space-y-8">
            <Choice
              legend="Cover"
              name="format"
              options={FORMATS}
              selected={format}
              onSelect={setFormat}
            />
            <Choice
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
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {EXTRAS.map((o) => {
                  const checked = extras.includes(o.id);
                  return (
                    <label
                      key={o.id}
                      className={`group flex cursor-pointer flex-col rounded-2xl border-[3px] border-brand-deep p-4 shadow-comic transition-transform duration-150 hover:-translate-y-0.5 ${
                        checked ? "bg-brand-yellow text-brand-deep" : "bg-white text-brand-deep"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleExtra(o.id)}
                      />
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold">{o.label}</span>
                        <span className="text-sm font-black">+<PriceTag price={o.price} /></span>
                      </span>
                      <span className="mt-1.5 text-sm font-medium text-brand-deep/70">{o.note}</span>
                      <span
                        aria-hidden
                        className={`mt-3 inline-flex h-6 w-6 items-center justify-center rounded-md border-[3px] border-brand-deep text-xs font-black ${
                          checked ? "bg-brand-pink text-white" : "bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-3xl border-[3px] border-brand-deep bg-white p-6 text-brand-deep shadow-comic-lg">
              <p className="text-sm font-black uppercase tracking-widest text-brand-pink">
                Your book so far
              </p>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-[family-name:var(--font-fredoka)] text-6xl font-bold leading-none">
                  <PriceTag price={total} />
                </span>
                <span className="mb-1 text-sm font-bold text-brand-deep/60">USD</span>
              </div>

              <ul className="mt-5 space-y-2 border-t-[3px] border-dashed border-brand-deep/20 pt-5 text-sm font-semibold">
                <SummaryRow label={FORMATS.find((o) => o.id === format)!.label} price={FORMATS.find((o) => o.id === format)!.price} />
                <SummaryRow label={LENGTHS.find((o) => o.id === length)!.label} price={LENGTHS.find((o) => o.id === length)!.price} />
                {EXTRAS.filter((o) => extras.includes(o.id)).map((o) => (
                  <SummaryRow key={o.id} label={o.label} price={o.price} />
                ))}
              </ul>

              <a
                href="#"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
              >
                Create your book →
              </a>
              <p className="mt-3 text-center text-xs font-semibold text-brand-deep/55">
                Free shipping. Full preview before anything prints.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, price }: { label: string; price: number }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-brand-deep/75">{label}</span>
      <span className="font-black">{price === 0 ? "Included" : <>+<PriceTag price={price} /></>}</span>
    </li>
  );
}

function Choice({
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
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
        {legend}
      </legend>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const isSelected = selected === o.id;
          return (
            <label
              key={o.id}
              className={`flex cursor-pointer flex-col rounded-2xl border-[3px] border-brand-deep p-4 shadow-comic transition-transform duration-150 hover:-translate-y-0.5 ${
                isSelected ? "bg-brand-blue text-brand-deep" : "bg-white text-brand-deep"
              }`}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={isSelected}
                onChange={() => onSelect(o.id)}
              />
              <span className="flex items-center justify-between gap-2">
                <span className="font-bold">{o.label}</span>
                <span className="text-sm font-black">
                  {o.price === 0 ? "Included" : <>+<PriceTag price={o.price} /></>}
                </span>
              </span>
              <span className="mt-1.5 text-sm font-medium text-brand-deep/70">{o.note}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
