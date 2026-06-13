/**
 * UploadedPhotos — a thumbnail grid of the photos the parent uploaded for this
 * order. Each thumbnail loads the small `preview` variant through the
 * ownership-gated route (plain <img>: gated URLs aren't Next/Image-optimizable).
 * Server component; no client state. Renders nothing when there are no assets.
 */
interface UploadedPhotosProps {
  orderId: string;
  assetIds: string[];
}

export function UploadedPhotos({ orderId, assetIds }: UploadedPhotosProps) {
  if (assetIds.length === 0) return null;

  return (
    <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        Photos you sent
      </h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {assetIds.map((assetId) => (
          <li key={assetId}>
            {/* eslint-disable-next-line @next/next/no-img-element -- gated dynamic media URL */}
            <img
              src={`/api/orders/${orderId}/asset/${assetId}`}
              alt="A photo you sent for this order"
              loading="lazy"
              className="aspect-square w-full rounded-2xl border-2 border-brand-deep object-cover"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
