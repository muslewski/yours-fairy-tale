const STEPS = ["The film", "The story", "Photos & checkout"];

export function StepNav({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-brand-deep text-sm font-black ${
                  active ? "bg-brand-pink text-white" : done ? "bg-brand-deep text-white" : "bg-white text-brand-deep"
                }`}
              >
                {n}
              </span>
              <span className={`hidden text-sm font-bold sm:inline ${active ? "text-brand-deep" : "text-brand-deep/50"}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {step > 1 ? (
        <button type="button" onClick={onBack} className="text-sm font-bold text-brand-deep/60 underline-offset-4 hover:underline">
          ← Back
        </button>
      ) : null}
    </div>
  );
}
