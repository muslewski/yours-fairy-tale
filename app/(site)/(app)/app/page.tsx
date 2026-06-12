import type { Metadata } from "next";
import Link from "next/link";

import { getOrdersForCurrentCustomer } from "@/lib/customer-data";
import {
  messageForStatus,
  stageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";
import { StatusTimeline } from "@/components/app/status-timeline";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";

export const metadata: Metadata = {
  title: "Your videos — Yours Fairy Tale",
};

interface OrderLike {
  id: string;
  childName?: string | null;
  world?: string | null;
  status: OrderStatus;
}

export default async function AppPage() {
  const orders = (await getOrdersForCurrentCustomer()) as OrderLike[];

  return (
    <div className="mx-auto max-w-2xl px-6">
      <header className="mb-10">
        <h1 className="text-4xl text-brand-deep md:text-5xl" style={{ fontFamily: "var(--font-fredoka)" }}>
          Your videos
        </h1>
        <p className="mt-2 text-lg text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          Follow every step as we bring their story to life.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-8">
          {orders.map((order) => (
            <li key={order.id} className="group">
              <OrderSummaryCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderSummaryCard({ order }: { order: OrderLike }) {
  const childName = order.childName?.trim() || undefined;
  const title = childName ? `${childName}'s fairy tale` : "Your fairy tale";
  const world = order.world ? WORLD_LABELS[order.world as WorldId] : undefined;
  const message = messageForStatus(order.status, childName);
  const onHappyPath = "activeIndex" in stageForStatus(order.status);

  return (
    <Link
      href={`/app/orders/${order.id}`}
      className="block rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic transition-shadow group-hover:shadow-comic-lg md:p-8"
    >
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl text-brand-deep md:text-3xl" style={{ fontFamily: "var(--font-fredoka)" }}>
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
        </div>
        <span
          className="shrink-0 pt-1 text-sm font-bold text-brand-deep/60"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          View details →
        </span>
      </header>

      {onHappyPath ? (
        <StatusTimeline status={order.status} childName={childName} className="mb-6" />
      ) : null}

      <div className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-5">
        <h3 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          {message.headline}
        </h3>
      </div>
    </Link>
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
