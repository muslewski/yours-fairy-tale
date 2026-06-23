import { AnimatePresence, motion } from "motion/react";
import { Segmented, type SegOption } from "./segmented";
import { RangeSlider } from "./range-slider";
import type { AddOn } from "@/lib/pricing";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function StepFilm({
  lengthOptions,
  length,
  setLength,
  extraMinutes,
  setExtraMinutes,
  totalMinutes,
  minutesCost,
  maxExtraMinutes,
  extraMinutePrice,
  detailOptions,
  detail,
  setDetail,
  addOns,
  addOnDefs,
  toggleAddOn,
  chosenAddOns,
}: {
  lengthOptions: SegOption[];
  length: string;
  setLength: (v: string) => void;
  extraMinutes: number;
  setExtraMinutes: (v: number) => void;
  totalMinutes: number;
  minutesCost: number;
  maxExtraMinutes: number;
  extraMinutePrice: number;
  detailOptions: SegOption[];
  detail: string;
  setDetail: (v: string) => void;
  addOns: string[];
  addOnDefs: AddOn[];
  toggleAddOn: (id: string) => void;
  chosenAddOns: AddOn[];
}) {
  return (
    <div className="space-y-9">
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
        max={maxExtraMinutes}
        totalMinutes={totalMinutes}
        cost={minutesCost}
        extraMinutePrice={extraMinutePrice}
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
          {addOnDefs.map((o) => {
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
  );
}
