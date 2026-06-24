import { AnimatedHeading } from "@/components/motion/animated-heading";

/**
 * The sample section, first thing below the hero. Two beats on one cream
 * background:
 *   1. "The film" — the polished animation sample (poster + preload="none", so
 *      zero video bytes load until the visitor presses play).
 *   2. "Their first reaction" — a child's real first watch (preload="metadata"
 *      so the first frame acts as the poster; no poster asset needed).
 * Both are public site-media Blob URLs, hardcoded like every other section
 * (a studio / Payload-block-driven version comes later). The null-src "coming
 * soon" branch stays as a graceful fallback for either video.
 */
const SAMPLE_VIDEO_SRC: string | null =
  "https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/sample-movie1-cIJRpGT7nq8rXiOMxT7Acs3nEyGRlv.mp4";
const SAMPLE_VIDEO_POSTER = "/sample/sample-poster.webp";
const REACTION_VIDEO_SRC: string | null =
  "https://vnbkdvadf65nev7m.public.blob.vercel-storage.com/site/YoursFairyTaleFirstReakcja-FiSaPidNATfgNMYikocS3ptMGL7Rpi.mp4";

function VideoCard({
  src,
  poster,
  preload,
  tilt = false,
  fallbackTitle,
  fallbackBody,
}: {
  src: string | null;
  poster?: string;
  preload: "none" | "metadata";
  tilt?: boolean;
  fallbackTitle: string;
  fallbackBody: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg ${
        tilt ? "rotate-[1deg]" : ""
      }`}
    >
      {src ? (
        <video
          src={src}
          poster={poster}
          preload={preload}
          controls
          playsInline
          className="aspect-video w-full bg-brand-deep"
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-brand-deep text-white">
          <span className="text-lg font-black uppercase tracking-wide">{fallbackTitle}</span>
          <span className="max-w-md text-sm font-medium text-white/70">{fallbackBody}</span>
        </div>
      )}
    </div>
  );
}

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

        {/* Beat 1 — the film */}
        <div className="mt-8">
          <span className="inline-block rounded-md border-[3px] border-brand-deep bg-brand-blue px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
            The film
          </span>
          <div className="mt-4">
            <VideoCard
              src={SAMPLE_VIDEO_SRC}
              poster={SAMPLE_VIDEO_POSTER}
              preload="none"
              fallbackTitle="Sample coming soon"
              fallbackBody="We're finishing our first sample film. It will live here, ready to watch, very soon."
            />
          </div>
        </div>

        {/* Connective line */}
        <p className="mt-10 font-[family-name:var(--font-fraunces)] text-lg italic text-brand-deep/60">
          and here&apos;s the part we make it for.
        </p>

        {/* Beat 2 — their first reaction */}
        <div className="mt-10">
          <span className="inline-block rotate-[1deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
            Their first reaction
          </span>
          <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-2xl font-bold uppercase tracking-tight sm:text-3xl">
            Watching them see themselves
          </h3>
          <div className="mt-8">
            <VideoCard
              src={REACTION_VIDEO_SRC}
              preload="metadata"
              tilt
              fallbackTitle="Reaction coming soon"
              fallbackBody="The first real reactions are on their way. They'll live right here."
            />
          </div>
          <p className="mt-6 text-sm font-medium text-brand-deep/60">
            A real first watch, the moment a child meets their own fairy tale.
          </p>
        </div>
      </div>
    </section>
  );
}
