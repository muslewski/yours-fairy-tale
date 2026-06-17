/**
 * /studio/orders/[id] — the order workstation.
 * Left: what they ordered (story, photos, notes — read-only).
 * Right: the work (workflow controls, delivery promise, proof + final film
 * upload slots — browser → Blob in prod, server action locally).
 */
import { notFound } from "next/navigation";
import Link from "next/link";

import { requireStudioUser } from "@/lib/studio-auth";
import { getPayloadClient } from "@/lib/payload";
import {
  NEXT_STEPS,
  STATUS_CHIPS,
  ALL_STATUSES,
  formatCents,
} from "@/lib/studio-workflow";
import { StatusChip } from "@/components/studio/status-chip";
import { WorkflowCard } from "@/components/studio/workflow-card";
import { PromisedByEditor } from "@/components/studio/promised-by-editor";
import { VideoUpload } from "@/components/studio/video-upload";
import { DeliveryLinkEditor } from "@/components/studio/delivery-link-editor";
import { isBlobStorageEnabled } from "@/lib/video-access";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { LENGTH_LABELS, DETAIL_LEVEL_LABELS } from "@/lib/order-options";
import type { OrderStatus } from "@/lib/order-stages";

interface MediaDoc {
  id: string;
  url?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  createdAt?: string;
}

function relationId(value: unknown): string | null {
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return value ? String(value) : null;
}

async function loadMedia(id: string | null): Promise<MediaDoc | null> {
  if (!id) return null;
  try {
    const payload = await getPayloadClient();
    return (await payload.findByID({
      collection: "media",
      id,
      depth: 0,
      overrideAccess: true,
    })) as unknown as MediaDoc;
  } catch {
    return null;
  }
}

export default async function StudioOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStudioUser();
  const { id } = await params;
  const payload = await getPayloadClient();

  const order = await payload.findByID({
    collection: "orders",
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  });
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const childName = (order.childName as string | null)?.trim() || "Unnamed hero";

  // Owner email for the header.
  let ownerEmail = "";
  const ownerId = relationId(order.owner);
  if (ownerId) {
    try {
      const owner = await payload.findByID({
        collection: "users",
        id: ownerId,
        depth: 0,
        overrideAccess: true,
      });
      ownerEmail = String(owner.email ?? "");
    } catch {
      /* leave blank — header copes */
    }
  }

  // Customer photos (assets), proof, final film.
  const assetIds = (Array.isArray(order.assets) ? order.assets : [])
    .map(relationId)
    .filter((v): v is string => Boolean(v));
  const assets = (await Promise.all(assetIds.map(loadMedia))).filter(
    (m): m is MediaDoc => m !== null,
  );
  const proof = await loadMedia(relationId(order.proof));
  const finalVideo = await loadMedia(relationId(order.finalVideo));

  const notes = (Array.isArray(order.customerNotes) ? order.customerNotes : []) as {
    message: string;
    createdAt?: string | null;
  }[];

  const world = order.world ? (WORLD_LABELS[order.world as WorldId] ?? String(order.world)) : null;
  const ordered = new Date(order.createdAt as string);

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/studio/orders"
          className="text-sm font-bold text-brand-deep/70 underline-offset-4 hover:underline"
        >
          ← Back to orders
        </Link>
      </div>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            {childName}&rsquo;s fairy tale
          </h1>
          <p className="mt-1 text-sm text-brand-deep/60">
            {ownerEmail || "owner unknown"} · ordered{" "}
            {new Intl.DateTimeFormat("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            }).format(ordered)}
          </p>
        </div>
        <div className="text-right">
          <StatusChip status={status} />
          <p className="mt-2 text-xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            {typeof order.amountTotalCents === "number"
              ? formatCents(order.amountTotalCents as number)
              : "amount not recorded"}
          </p>
          {order.stripePaymentIntentId ? (
            <a
              href={`https://dashboard.stripe.com/payments/${order.stripePaymentIntentId}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View this payment in Stripe (opens in a new tab)"
              className="text-xs font-bold text-brand-deep/60 underline-offset-4 hover:underline"
            >
              view in Stripe ↗
            </a>
          ) : null}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* ── Left: what they ordered ─────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <section
            aria-label="The story they ordered"
            className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
          >
            <h2 className="mb-3 text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              The story they ordered
            </h2>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {world ? <Row label="World" value={world} /> : null}
              {order.length ? (
                <Row label="Length" value={LENGTH_LABELS[order.length as string] ?? String(order.length)} />
              ) : null}
              {order.detailLevel ? (
                <Row
                  label="Detail"
                  value={DETAIL_LEVEL_LABELS[order.detailLevel as string] ?? String(order.detailLevel)}
                />
              ) : null}
              {typeof order.extraMinutes === "number" && order.extraMinutes > 0 ? (
                <Row label="Extra minutes" value={String(order.extraMinutes)} />
              ) : null}
              {Array.isArray(order.addOns) && order.addOns.length > 0 ? (
                <Row label="Add-ons" value={(order.addOns as string[]).join(", ")} />
              ) : null}
            </dl>
            {typeof order.plotNote === "string" && order.plotNote.trim() ? (
              <div className="mt-3 rounded-2xl border-2 border-dashed border-brand-deep/30 bg-brand-cream p-3 text-sm">
                <span className="font-bold">Plot idea:</span>{" "}
                <span className="whitespace-pre-wrap">{order.plotNote.trim()}</span>
              </div>
            ) : null}
          </section>

          <section
            aria-label="Their photos"
            className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
          >
            <h2 className="mb-3 text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Their photos · {assets.length}
            </h2>
            {assets.length === 0 ? (
              <p className="text-sm text-brand-deep/60">No photos yet.</p>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {assets.map((m) => (
                  <li key={m.id}>
                    {/* Served through the staff-gated proxy keyed by media id
                        (/studio/api/media/[id]) — NOT Payload's /api/media/file,
                        which 404s on the configurator/ slash in the filename. The
                        proxy requires a studio session and never exposes the raw
                        Blob URL of a child's photo. */}
                    {m.filename ? (
                      <a
                        href={`/studio/api/media/${m.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- gated dynamic media proxy */}
                        <img
                          src={`/studio/api/media/${m.id}`}
                          alt="Customer photo"
                          width={96}
                          height={96}
                          loading="lazy"
                          className="h-24 w-24 rounded-xl border-2 border-brand-deep object-cover"
                        />
                      </a>
                    ) : (
                      <div
                        title={m.filename ?? "photo"}
                        className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-brand-deep/30 text-center text-xs text-brand-deep/50"
                      >
                        file missing
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-label="Notes from the parent"
            className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
          >
            <h2 className="mb-3 text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Notes from the parent
            </h2>
            {typeof order.revisionNote === "string" && order.revisionNote.trim() ? (
              <div className="mb-3 rounded-2xl border-2 border-brand-pink bg-brand-pink/10 p-3 text-sm">
                <p className="font-bold text-brand-pink">Change request</p>
                <p className="mt-0.5 whitespace-pre-wrap text-brand-deep/80">
                  {order.revisionNote.trim()}
                </p>
              </div>
            ) : null}
            {notes.length === 0 ? (
              <p className="text-sm text-brand-deep/60">No notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {notes.map((note, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border-2 border-brand-deep/20 p-3 text-sm"
                  >
                    {note.createdAt ? (
                      <p className="text-xs font-bold text-brand-deep/50">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        }).format(new Date(note.createdAt))}
                      </p>
                    ) : null}
                    <p className="mt-0.5 whitespace-pre-wrap text-brand-deep/80">{note.message}</p>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-brand-deep/50">
              Replies happen over email — this thread is the parent&rsquo;s side only.
            </p>
          </section>
        </div>

        {/* ── Right: the work ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <WorkflowCard
            orderId={String(order.id)}
            status={status}
            statusLabel={STATUS_CHIPS[status].label}
            nextSteps={NEXT_STEPS[status]}
            allStatuses={[...ALL_STATUSES]}
            statusLabels={Object.fromEntries(
              ALL_STATUSES.map((s) => [s, STATUS_CHIPS[s].label]),
            )}
          />

          <PromisedByEditor
            orderId={String(order.id)}
            promisedBy={(order.promisedBy as string | null) ?? null}
          />

          {status === "proof_ready" ? (
            <p className="text-sm font-semibold text-brand-deep/70">
              The preview is with the parent — they&apos;ll approve it or request a change.
            </p>
          ) : null}
          <div>
            <VideoUpload
              orderId={String(order.id)}
              kind="proof"
              title="Preview film"
              hint="Sharing the proof emails the parent automatically."
              blobEnabled={isBlobStorageEnabled()}
              current={proof ? { filename: proof.filename ?? null, url: proof.url ?? null } : null}
            />
            <DeliveryLinkEditor
              orderId={String(order.id)}
              kind="proof"
              current={(order.proofUrl as string | null) ?? null}
            />
          </div>
          <div>
            <VideoUpload
              orderId={String(order.id)}
              kind="finalVideo"
              title="Final film"
              hint="Marking the order delivered emails the parent automatically."
              blobEnabled={isBlobStorageEnabled()}
              current={
                finalVideo
                  ? { filename: finalVideo.filename ?? null, url: finalVideo.url ?? null }
                  : null
              }
            />
            <DeliveryLinkEditor
              orderId={String(order.id)}
              kind="finalVideo"
              current={(order.finalVideoUrl as string | null) ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-cream p-2.5">
      <dt className="text-xs font-semibold uppercase tracking-wider text-brand-deep/50">{label}</dt>
      <dd className="mt-0.5 font-bold text-brand-deep">{value}</dd>
    </div>
  );
}

