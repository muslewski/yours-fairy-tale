const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export function RangeSlider({
  value,
  onChange,
  max,
  totalMinutes,
  cost,
  extraMinutePrice,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  totalMinutes: number;
  cost: number;
  extraMinutePrice: number;
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
          {cost > 0 ? `+${usd(cost)}` : ""}
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
        Each extra minute adds ${extraMinutePrice} to the base length.
      </p>
    </fieldset>
  );
}
