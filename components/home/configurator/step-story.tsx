import { WorldPicker } from "./world-picker";
import type { WorldId } from "@/lib/worlds";

export function StepStory({
  childName,
  setChildName,
  world,
  setWorld,
  plotNote,
  setPlotNote,
}: {
  childName: string;
  setChildName: (v: string) => void;
  world: WorldId;
  setWorld: (w: WorldId) => void;
  plotNote: string;
  setPlotNote: (v: string) => void;
}) {
  return (
    <div className="space-y-9">
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

      <div>
        <label htmlFor="plot-note" className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
          Your own plot idea <span className="text-base font-medium text-brand-deep/50">(optional)</span>
        </label>
        <textarea
          id="plot-note" value={plotNote} maxLength={500}
          onChange={(e) => setPlotNote(e.target.value)}
          placeholder="A brave knight who is afraid of the dark, and the kitten who helps them…"
          rows={3}
          className="mt-4 w-full rounded-2xl border-[3px] border-brand-deep bg-brand-cream px-4 py-3 text-base font-semibold text-brand-deep outline-none placeholder:text-brand-deep/40 focus-visible:ring-4 focus-visible:ring-brand-pink/40"
        />
        <p className="mt-3 text-sm font-medium text-brand-deep/60">
          Tell us anything you'd like in the story. Most helpful when you pick a story of your own.
        </p>
      </div>
    </div>
  );
}
