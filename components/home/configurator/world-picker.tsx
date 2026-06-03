import { motion } from "motion/react";
import { WORLDS, type WorldId } from "@/lib/worlds";

export function WorldPicker({
  selected,
  onSelect,
}: {
  selected: WorldId;
  onSelect: (id: WorldId) => void;
}) {
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
        Choose a plot
      </legend>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {WORLDS.map((w) => {
          const active = selected === w.id;
          return (
            <motion.label
              key={w.id}
              whileTap={{ scale: 0.94 }}
              className={`flex cursor-pointer items-center rounded-full border-[3px] border-brand-deep px-4 py-2.5 text-sm font-bold shadow-comic-sm transition-colors ${
                active ? "bg-brand-deep text-white" : "bg-white text-brand-deep"
              }`}
            >
              <input
                type="radio"
                name="world"
                className="sr-only"
                checked={active}
                onChange={() => onSelect(w.id)}
              />
              {w.label}
            </motion.label>
          );
        })}
      </div>
      <p className="mt-3 text-sm font-medium text-brand-deep/60">
        Pick one of our ready story worlds, or choose your own to shape it with us.
      </p>
    </fieldset>
  );
}
