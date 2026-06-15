import { AnimatedHeading } from "@/components/motion/animated-heading";

/**
 * The sample-film section, first thing below the hero. Until the real sample
 * video is provided, it shows a calm "coming soon" placeholder. To go live,
 * set SAMPLE_VIDEO_SRC to the video URL — the placeholder is replaced by an
 * inline <video> automatically; nothing else changes.
 */
const SAMPLE_VIDEO_SRC: string | null = null;

export function Sample() {
  return (
    <section id="sample" className="bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-6 text-center sm:px-10">
        <span className="inline-block rotate-[-1deg] rounded-lg border-[3px] border-brand-deep bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          See a sample
        </span>
        <AnimatedHeading
          as="h2"
          text="Watch a sample film"
          className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
        />
        <div className="mt-10 overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg">
          {SAMPLE_VIDEO_SRC ? (
            <video
              src={SAMPLE_VIDEO_SRC}
              controls
              playsInline
              className="aspect-video w-full bg-brand-deep"
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-brand-deep text-white">
              <span className="text-lg font-black uppercase tracking-wide">
                Sample coming soon
              </span>
              <span className="max-w-md text-sm font-medium text-white/70">
                We&apos;re finishing our first sample film. It will live here, ready
                to watch, very soon.
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
