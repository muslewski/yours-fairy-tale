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
import {
  messageForStatus,
  stageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";
import { StatusTimeline } from "@/components/app/status-timeline";

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
            {orders.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function OrderCard({ order }: { order: OrderLike }) {
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
        Per-status ACTION slot — built in later tasks, not here.
          • awaiting_assets → photo upload          (task 4.2)
          • proof_ready     → watch + approve proof  (task 4.3)
          • delivered       → final video player     (task 4.4)
        Leaving a labeled placeholder so the seam is obvious; do not build the
        actions in this task.
      */}
      <ActionSlot status={order.status} />
    </article>
  );
}

/**
 * Placeholder for the per-status action that lands in a later task. Renders a
 * quiet labeled slot for the statuses that will get an action, and nothing for
 * the rest. Intentionally NOT the real action UI.
 */
function ActionSlot({ status }: { status: OrderStatus }) {
  const labels: Partial<Record<OrderStatus, string>> = {
    awaiting_assets: "Photo upload coming here",
    proof_ready: "Preview player and approval coming here",
    delivered: "Your video player coming here",
  };
  const label = labels[status];
  if (!label) return null;

  return (
    <div
      className="mt-5 rounded-2xl border-2 border-dashed border-brand-deep/30 px-5 py-4"
      data-action-slot={status}
    >
      <p
        className="text-sm font-semibold uppercase tracking-widest text-brand-deep/40"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        {label}
      </p>
    </div>
  );
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
