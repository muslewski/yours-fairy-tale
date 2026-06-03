/**
 * /app — the customer dashboard.
 *
 * The emotional center of the customer area: after checkout, a parent waits
 * days to weeks while the studio hand-animates their video. This page reassures
 * them through that wait. For each order it shows a comic-styled card with the
 * child's name, the chosen world, the production timeline, and a calm,
 * status-aware message.
 *
 * The session is already verified by the (app) layout, so this server component
 * trusts it exists and reads owner-scoped orders via getOrdersForCurrentCustomer().
 *
 * Per-status ACTIONS (photo upload, proof approval, the video player) are
 * SEPARATE later tasks. This page leaves a clearly labeled slot where each
 * lands — it does not build them (YAGNI).
 *
 * Copy is parent-facing and runs through the brand-voice guide.
 */
import type { Metadata } from "next";
import Link from "next/link";

import { getOrdersForCurrentCustomer } from "@/lib/customer-data";
import { getPayloadClient } from "@/lib/payload";
import {
  messageForStatus,
  stageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";
import { StatusTimeline } from "@/components/app/status-timeline";
import { PhotoUpload } from "@/components/app/photo-upload";
import { ProofReview } from "@/components/app/proof-review";

export const metadata: Metadata = {
  title: "Your videos — Yours Fairy Tale",
};

/** Friendly names for the story worlds (mirrors the Orders `world` options). */
const WORLD_LABELS: Record<string, string> = {
  bedtime: "Bedtime adventure",
  space: "Outer space",
  sea: "Under the sea",
  forest: "Enchanted forest",
  dragons: "Dragons and castles",
  birthday: "Birthday surprise",
  custom: "A story of your own",
};

/** The shape we actually read off an order doc (depth 0 from Payload). */
interface OrderLike {
  id: string;
  childName?: string | null;
  world?: string | null;
  status: OrderStatus;
  proof?: string | null;
}

/** The proof media fields the proof-review action needs to render it. */
interface ProofMedia {
  url?: string | null;
  mimeType?: string | null;
  alt?: string | null;
}

/**
 * Resolve a proof media id to the fields the review component renders. Read via
 * the Local API with overrideAccess (media is staff-only). Returns null if
 * there is no proof yet or it cannot be loaded.
 */
async function loadProof(proofId?: string | null): Promise<ProofMedia | null> {
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
      url: media.url ?? null,
      mimeType: media.mimeType ?? null,
      alt: media.alt ?? null,
    };
  } catch {
    return null;
  }
}

export default async function AppPage() {
  const orders = (await getOrdersForCurrentCustomer()) as OrderLike[];

  return (
    <main className="min-h-screen bg-brand-cream px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10">
          <h1
            className="text-4xl text-brand-deep md:text-5xl"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            Your videos
          </h1>
          <p
            className="mt-2 text-lg text-brand-deep/70"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Follow every step as we bring their story to life.
          </p>
        </header>

        {orders.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-8">
            {await Promise.all(
              orders.map(async (order) => (
                <li key={order.id}>
                  <OrderCard
                    order={order}
                    proof={
                      order.status === "proof_ready"
                        ? await loadProof(order.proof)
                        : null
                    }
                  />
                </li>
              )),
            )}
          </ul>
        )}
      </div>
    </main>
  );
}

function OrderCard({
  order,
  proof,
}: {
  order: OrderLike;
  proof: ProofMedia | null;
}) {
  const childName = order.childName?.trim() || undefined;
  const title = childName
    ? `${childName}'s fairy tale`
    : "Your fairy tale";
  const world = order.world ? WORLD_LABELS[order.world] : undefined;
  const message = messageForStatus(order.status, childName);
  const result = stageForStatus(order.status);
  const onHappyPath = "activeIndex" in result;

  return (
    <article className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <header className="mb-6">
        <h2
          className="text-2xl text-brand-deep md:text-3xl"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          {title}
        </h2>
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
        <StatusTimeline
          status={order.status}
          childName={childName}
          className="mb-7"
        />
      ) : null}

      {/* Status-aware message — the calm, reassuring note for this moment. */}
      <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
        <h3
          className="text-lg text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          {message.headline}
        </h3>
        <p
          className="mt-1 text-brand-deep/80"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          {message.body}
        </p>
      </div>

      {/*
        Per-status ACTION slot.
          • awaiting_assets → photo upload     (task 4.2 — built)
          • proof_ready     → proof review     (task 4.3 — built)
          • delivered       → final video player (task 4.4 — still a placeholder)
      */}
      <ActionSlot order={order} childName={childName} proof={proof} />
    </article>
  );
}

/**
 * The per-status action. awaiting_assets and proof_ready now render the real
 * customer actions (photo upload, proof review). delivered keeps a labeled
 * placeholder until the video player lands (task 4.4). Other statuses render
 * nothing.
 */
function ActionSlot({
  order,
  childName,
  proof,
}: {
  order: OrderLike;
  childName?: string;
  proof: ProofMedia | null;
}) {
  if (order.status === "awaiting_assets") {
    return <PhotoUpload orderId={order.id} childName={childName} />;
  }

  if (order.status === "proof_ready") {
    return (
      <ProofReview orderId={order.id} childName={childName} proof={proof} />
    );
  }

  if (order.status === "delivered") {
    return (
      <div
        className="mt-5 rounded-2xl border-2 border-dashed border-brand-deep/30 px-5 py-4"
        data-action-slot="delivered"
      >
        <p
          className="text-sm font-semibold uppercase tracking-widest text-brand-deep/40"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Your video player coming here
        </p>
      </div>
    );
  }

  return null;
}

function EmptyState() {
  return (
    <div className="rounded-3xl border-2 border-brand-deep bg-white p-8 shadow-comic">
      <h2
        className="text-2xl text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        No videos yet
      </h2>
      <p
        className="mt-2 text-brand-deep/70"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        When you create one, it will live here so you can follow every step as
        we bring their story to life.
      </p>
      <Link
        href="/#build"
        className="mt-6 inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        Create their video
      </Link>
    </div>
  );
}
