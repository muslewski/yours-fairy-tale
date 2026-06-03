import { AnimatePresence, motion } from "motion/react";

export type SegOption = { id: string; label: string; caption: string; note: string };

export function Segmented({
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
