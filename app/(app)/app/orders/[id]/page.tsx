/**
 * /app/orders/[id] — one order's full page.
 *
 * Owner-scoped: reads via getOrderForCurrentCustomer(id) and 404s if the order
 * is not the signed-in customer's. Shows the status timeline + message, the
 * relocated per-status action (photo upload / proof review / final video), a
 * read-only summary of the choices the parent made, and the studio notes thread.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrderForCurrentCustomer } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";
import {
  messageForStatus,
  stageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";
import { LENGTH_LABELS, DETAIL_LEVEL_LABELS } from "@/lib/order-options";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { StatusTimeline } from "@/components/app/status-timeline";
import { PhotoUpload } from "@/components/app/photo-upload";
import { ProofReview } from "@/components/app/proof-review";
import { VideoPlayer } from "@/components/app/video-player";
import { OrderNotes, type CustomerNote } from "@/components/app/order-notes";

export const metadata: Metadata = {
  title: "Your order — Yours Fairy Tale",
};

interface ProofMedia {
  url?: string | null;
  mimeType?: string | null;
  alt?: string | null;
}

async function loadProof(
  orderId: string,
  proofId?: string | null,
): Promise<ProofMedia | null> {
  if (!proofId) return null;
  try {
    const payload = await getPayloadClient();
    const media = await payload.findByID({
      collection: "media",
      id: proofId,
      depth: 0,
      overrideAccess: true,
    });
    return {
      // The ownership-gated route — NOT media.url, whose adminOnly read 403s
      // for parents (spec addendum, 2026-06-10).
      url: `/api/orders/${orderId}/video?kind=proof`,
      mimeType: media.mimeType ?? null,
      alt: media.alt ?? null,
    };
  } catch {
    return null;
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForCurrentCustomer(id);
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const childName =
    typeof order.childName === "string" && order.childName.trim()
      ? order.childName.trim()
      : undefined;
  const title = childName ? `${childName}'s fairy tale` : "Your fairy tale";
  const world = order.world ? WORLD_LABELS[order.world as WorldId] : undefined;
  const message = messageForStatus(status, childName);
  const result = stageForStatus(status);
  const onHappyPath = "activeIndex" in result;
  const proof =
    status === "proof_ready"
      ? await loadProof(String(order.id), order.proof as string | null)
      : null;
  const notes = (Array.isArray(order.customerNotes) ? order.customerNotes : []) as CustomerNote[];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6">
      <div>
        <Link
          href="/app"
          className="text-sm font-bold text-brand-deep/70 underline-offset-4 hover:underline"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          ← Back to your videos
        </Link>
      </div>

      <article className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
        <header className="mb-6">
          <h1 className="text-3xl text-brand-deep md:text-4xl" style={{ fontFamily: "var(--font-fredoka)" }}>
            {title}
          </h1>
          {world ? (
            <p
              className="mt-1 text-sm font-semibold uppercase tracking-widest text-brand-pink"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              {world}
            </p>
          ) : null}
        </header>

        {onHappyPath ? (
          <StatusTimeline status={status} childName={childName} className="mb-7" />
        ) : null}

        <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
          <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            {message.headline}
          </h2>
          <p className="mt-1 text-brand-deep/80" style={{ fontFamily: "var(--font-quicksand)" }}>
            {message.body}
          </p>
        </div>

        <ActionSlot order={order} status={status} childName={childName} proof={proof} />
      </article>

      <StoryPanel order={order} />

      <OrderNotes orderId={String(order.id)} notes={notes} />
    </div>
  );
}

function ActionSlot({
  order,
  status,
  childName,
  proof,
}: {
  order: Record<string, unknown>;
  status: OrderStatus;
  childName?: string;
  proof: ProofMedia | null;
}) {
  if (status === "awaiting_assets") {
    return (
      <div className="mt-6">
        <PhotoUpload orderId={String(order.id)} childName={childName} />
      </div>
    );
  }
  if (status === "proof_ready") {
    return (
      <div className="mt-6">
        <ProofReview orderId={String(order.id)} childName={childName} proof={proof} />
      </div>
    );
  }
  if (status === "delivered") {
    return (
      <div className="mt-6">
        <VideoPlayer
          orderId={String(order.id)}
          childName={childName}
          hasVideo={Boolean(order.finalVideo)}
        />
      </div>
    );
  }
  return null;
}

/** A read-only summary of the choices the parent made at checkout. */
function StoryPanel({ order }: { order: Record<string, unknown> }) {
  const world = order.world ? WORLD_LABELS[order.world as WorldId] : undefined;
  const length = order.length ? LENGTH_LABELS[order.length as string] : undefined;
  const detail = order.detailLevel ? DETAIL_LEVEL_LABELS[order.detailLevel as string] : undefined;
  const extraMinutes = typeof order.extraMinutes === "number" ? order.extraMinutes : 0;
  const addOns = Array.isArray(order.addOns) ? (order.addOns as string[]) : [];
  const plotNote = typeof order.plotNote === "string" ? order.plotNote.trim() : "";

  const rows: { label: string; value: string }[] = [];
  if (world) rows.push({ label: "World", value: world });
  if (length) rows.push({ label: "Length", value: length });
  if (detail) rows.push({ label: "Detail", value: detail });
  if (extraMinutes > 0) rows.push({ label: "Extra minutes", value: String(extraMinutes) });
  if (addOns.length > 0) rows.push({ label: "Add-ons", value: addOns.join(", ") });

  if (rows.length === 0 && !plotNote) return null;

  return (
    <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        Your story
      </h2>
      {rows.length > 0 ? (
        <dl className="grid grid-cols-2 gap-3" style={{ fontFamily: "var(--font-quicksand)" }}>
          {rows.map((row) => (
            <div key={row.label} className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-3">
              <dt className="text-xs font-semibold uppercase tracking-wider text-brand-deep/50">
                {row.label}
              </dt>
              <dd className="mt-0.5 font-bold text-brand-deep">{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {plotNote ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-deep/50">
            Your plot idea
          </p>
          <p
            className="mt-1 whitespace-pre-wrap text-brand-deep/80"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            {plotNote}
          </p>
        </div>
      ) : null}
    </section>
  );
}
