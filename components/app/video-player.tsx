/**
 * VideoPlayer — the `delivered` action (Task 4.4).
 *
 * The finished film, ready to watch. The <video> and the download link both
 * point at the ownership-gated route (app/(app)/api/orders/[id]/video) rather
 * than a direct media URL, because the `media` collection is read: adminOnly —
 * access is enforced by who owns the order, not by a guessable static path.
 *
 * Plain (no "use client"): a native <video controls> needs no state or motion,
 * so this stays a server component. If `hasVideo` is false (a delivered order
 * whose film is not attached yet) it renders a calm "being finalized" fallback
 * instead of an empty player.
 *
 * Copy runs through the brand-voice guide: calm, warm, parent-facing.
 */
interface VideoPlayerProps {
  orderId: string;
  childName?: string;
  /** False when the order is delivered but finalVideo is not attached yet. */
  hasVideo: boolean;
}

export function VideoPlayer({ orderId, childName, hasVideo }: VideoPlayerProps) {
  const subject = childName?.trim() || "your child";
  const src = `/api/orders/${orderId}/video`;

  return (
    <div
      className="mt-5 rounded-2xl border-2 border-brand-deep bg-brand-cream p-5"
      data-action-slot="delivered"
    >
      <h3
        className="text-lg text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        {childName ? `${childName}'s fairy tale is ready` : "Your fairy tale is ready"}
      </h3>
      <p
        className="mt-1 text-sm text-brand-deep/70"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        {hasVideo
          ? "Find a cozy spot and watch it together. It is yours to keep, again and again."
          : "We are adding the final touches to their film. It will appear here very soon."}
      </p>

      {hasVideo ? (
        <>
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-brand-deep bg-brand-deep">
            <video
              src={src}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
              aria-label={`${subject}'s finished fairy tale`}
            />
          </div>

          <div className="mt-4">
            <a
              href={`${src}?download`}
              download
              className="inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Download the film
            </a>
          </div>
        </>
      ) : (
        <div
          className="mt-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-deep/30 bg-white px-5 py-10 text-center text-sm text-brand-deep/60"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Your video is being finalized.
        </div>
      )}
    </div>
  );
}
