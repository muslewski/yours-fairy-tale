import type { MediaBlock } from "@/lib/pages-types";

export function MediaRender({ block }: { block: MediaBlock }) {
  const m = typeof block.media === "object" ? block.media : null;
  const url = m?.url ?? undefined;
  if (!url) return null;
  const portrait = block.aspect === "portrait";
  const isVideo = (m?.mimeType ?? "").startsWith("video/");
  return (
    <section className="bg-brand-cream px-6 py-12 text-center">
      <div className={portrait ? "mx-auto w-full max-w-[340px]" : "mx-auto max-w-4xl"}>
        <div
          className={`overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg ${
            portrait ? "aspect-[9/16]" : "aspect-video"
          }`}
        >
          {isVideo ? (
            <video
              src={url}
              controls
              playsInline
              preload="none"
              className="h-full w-full bg-brand-deep object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={m?.alt ?? block.caption ?? ""}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        {block.caption ? (
          <p className="mt-4 text-sm font-medium text-brand-deep/60">{block.caption}</p>
        ) : null}
      </div>
    </section>
  );
}
