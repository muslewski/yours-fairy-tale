"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import {
  ADDONS,
  DETAILS,
  EXTRA_MINUTE_PRICE,
  LENGTHS,
  summarizeSelections,
} from "@/lib/pricing";
import { type SegOption } from "./segmented";
import { PriceRail } from "./price-rail";
import { StepNav } from "./step-nav";
import { StepFilm } from "./step-film";
import { StepStory } from "./step-story";
import { StepPhotos } from "./step-photos";
import type { WorldId } from "@/lib/worlds";

const pct = (multiplier: number) => Math.round((multiplier - 1) * 100);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function Configurator() {
  const reduce = useReducedMotion();

  const [childName, setChildName] = useState("");
  const [world, setWorld] = useState<WorldId>("bedtime");
  const [length, setLength] = useState("medium");
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [detail, setDetail] = useState("basic");
  const [addOns, setAddOns] = useState<string[]>(["narration"]);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [plotNote, setPlotNote] = useState("");
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [step, setStep] = useState(1);

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
          plotNote: plotNote.trim(),
          assetPaths: photoPaths,
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

  const goToStep = (n: number) => {
    setStatus("idle"); // clear any stale checkout error when changing steps
    setStep(n);
  };
  const onPrimary = () => (step < 3 ? goToStep(step + 1) : startCheckout());
  const primaryLabel =
    step < 3 ? "Continue →" : status === "pending" ? "Taking you to checkout…" : "Create their video →";

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
        onClick={onPrimary}
        disabled={status === "pending"}
        whileHover={status === "pending" ? undefined : { y: -2 }}
        whileTap={status === "pending" ? undefined : { y: 1, scale: 0.99 }}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic disabled:cursor-not-allowed disabled:opacity-70"
      >
        {primaryLabel}
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
            Start with the film, then tell us the story and who it&apos;s for. Add photos and check out when you&apos;re ready. You can change anything before we animate a thing.
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
            <StepNav step={step} onBack={() => goToStep(Math.max(1, step - 1))} />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduce ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: 0.22 }}
              >
                {step === 1 && (
                  <StepFilm
                    lengthOptions={lengthOptions}
                    length={length}
                    setLength={setLength}
                    extraMinutes={extraMinutes}
                    setExtraMinutes={setExtraMinutes}
                    totalMinutes={totalMinutes}
                    minutesCost={minutesCost}
                    detailOptions={detailOptions}
                    detail={detail}
                    setDetail={setDetail}
                    addOns={addOns}
                    toggleAddOn={toggleAddOn}
                    chosenAddOns={chosenAddOns}
                  />
                )}
                {step === 2 && (
                  <StepStory
                    childName={childName}
                    setChildName={setChildName}
                    world={world}
                    setWorld={setWorld}
                    plotNote={plotNote}
                    setPlotNote={setPlotNote}
                  />
                )}
                {step === 3 && (
                  <StepPhotos
                    summary={summarizeSelections({ length, detail, extraMinutes, addOns })}
                    photoPaths={photoPaths}
                    setPhotoPaths={setPhotoPaths}
                  />
                )}
              </motion.div>
            </AnimatePresence>
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
