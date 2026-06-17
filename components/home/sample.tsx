import { AnimatedHeading } from "@/components/motion/animated-heading";

/**
 * The sample-film section, first thing below the hero. Shows the real sample
 * film in an inline <video> with native controls — click-to-play, it never
 * autoplays. `preload="none"` + a poster frame (public/sample/sample-poster.webp)
 * means ZERO video bytes load until the visitor presses play; the film itself is
 * a public site-media Blob URL. The "coming soon" branch stays as a graceful
 * fallback if SAMPLE_VIDEO_SRC is ever cleared.
 */
const SAMPLE_VIDEO_SRC: string | null =
  "https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/sample-movie1-cIJRpGT7nq8rXiOMxT7Acs3nEyGRlv.mp4";
const SAMPLE_VIDEO_POSTER = "/sample/sample-poster.webp";

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
              poster={SAMPLE_VIDEO_POSTER}
              preload="none"
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
