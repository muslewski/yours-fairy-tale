"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import {
  ADDONS,
  DETAILS,
  EXTRA_MINUTE_PRICE,
  LENGTHS,
  MAX_EXTRA_MINUTES,
} from "@/lib/pricing";
import { Segmented, type SegOption } from "./segmented";
import { RangeSlider } from "./range-slider";
import { WorldPicker } from "./world-picker";
import { PriceRail } from "./price-rail";
import type { WorldId } from "@/lib/worlds";

const pct = (multiplier: number) => Math.round((multiplier - 1) * 100);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function Configurator() {
  const [childName, setChildName] = useState("");
  const [world, setWorld] = useState<WorldId>("bedtime");
  const [length, setLength] = useState("medium");
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [detail, setDetail] = useState("basic");
  const [addOns, setAddOns] = useState<string[]>(["narration"]);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  const tier = LENGTHS.find((o) => o.id === length)!;
  const lvl = DETAILS.find((o) => o.id === detail)!;
  const chosenAddOns = useMemo(() => ADDONS.filter((o) => addOns.includes(o.id)), [addOns]);

  const minutesCost = extraMinutes * EXTRA_MINUTE_PRICE;
  const addOnsCost = chosenAddOns.reduce((s, o) => s + o.price, 0);
  const subtotal = tier.price + minutesCost + addOnsCost;
  const surcharge = Math.round(subtotal * (lvl.multiplier - 1));
  const total = subtotal + surcharge;
  const totalMinutes = tier.minutes + extraMinutes;

  const toggleAddOn = (id: string) =>
    setAddOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const startCheckout = async () => {
    setStatus("pending");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: childName.trim(),
          world,
          length,
          detail,
          extraMinutes,
          addOns,
        }),
      });
      if (!res.ok) throw new Error(`Checkout failed (${res.status})`);
      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("No checkout URL returned.");
      window.location.href = url;
    } catch {
      setStatus("error");
    }
  };

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

  const cta = (
    <>
      <motion.button
        type="button"
        onClick={startCheckout}
        disabled={status === "pending"}
        whileHover={status === "pending" ? undefined : { y: -2 }}
        whileTap={status === "pending" ? undefined : { y: 1, scale: 0.99 }}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === "pending" ? "Taking you to checkout…" : "Create their video →"}
      </motion.button>
      <AnimatePresence mode="wait">
        {status === "error" ? (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-3 text-center text-xs font-bold text-brand-deep"
            role="alert"
          >
            Something went wrong while starting checkout. Please try again in a moment.
          </motion.p>
        ) : (
          <motion.p
            key="reassure"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="mt-3 text-center text-xs font-semibold text-brand-deep/60"
          >
            Secure checkout. Full preview before we animate.
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );

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
            Tell us who the story is for and pick a plot. Then choose a length and the level
            of detail. You can change any of it before we animate a thing.
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
            <div>
              <label
                htmlFor="child-name"
                className="font-[family-name:var(--font-fredoka)] text-xl font-semibold"
              >
                Who is it for?
              </label>
              <input
                id="child-name"
                type="text"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                autoComplete="off"
                maxLength={40}
                placeholder="Their first name"
                className="mt-4 w-full rounded-2xl border-[3px] border-brand-deep bg-brand-cream px-4 py-3 text-base font-bold text-brand-deep outline-none placeholder:font-semibold placeholder:text-brand-deep/40 focus-visible:ring-4 focus-visible:ring-brand-pink/40"
              />
              <p className="mt-3 text-sm font-medium text-brand-deep/60">
                The child becomes the hero of the story. You can add this later if you like.
              </p>
            </div>

            <WorldPicker selected={world} onSelect={setWorld} />

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
                      <span className="font-black">+{usd(o.price)}</span>
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
          <PriceRail
            total={total}
            totalMinutes={totalMinutes}
            lvl={lvl}
            tier={tier}
            extraMinutes={extraMinutes}
            minutesCost={minutesCost}
            chosenAddOns={chosenAddOns}
            surcharge={surcharge}
            cta={cta}
          />
        </motion.div>
      </div>
    </section>
  );
}
