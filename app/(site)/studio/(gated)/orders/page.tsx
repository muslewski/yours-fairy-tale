/**
 * /studio/orders — every order, newest first, filterable by status via the
 * `?status=` search param (chips across the top; links, not client state).
 */
import Link from "next/link";

import { getAllOrders } from "@/lib/studio-data";
import {
  ALL_STATUSES,
  STATUS_CHIPS,
  formatCents,
  formatAge,
} from "@/lib/studio-workflow";
import { StatusChip } from "@/components/studio/status-chip";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { LENGTH_LABELS } from "@/lib/order-options";
import type { OrderStatus } from "@/lib/order-stages";

export default async function StudioOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = ALL_STATUSES.includes(status as OrderStatus)
    ? (status as OrderStatus)
    : null;

  const all = await getAllOrders();
  const orders = filter ? all.filter((o) => o.status === filter) : all;
  const now = new Date();

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-4xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Orders
        </h1>
      </header>

      <nav aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
        <FilterChip href="/studio/orders" label="All" active={!filter} />
        {ALL_STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/studio/orders?status=${s}`}
            label={STATUS_CHIPS[s].label}
            active={filter === s}
          />
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="rounded-3xl border-2 border-brand-deep bg-white p-8 text-center text-brand-deep/60 shadow-comic">
          No orders here yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/studio/orders/${order.id}`}
                className="flex items-center justify-between gap-4 rounded-2xl border-2 border-brand-deep bg-white px-5 py-3.5 shadow-comic-sm transition-shadow hover:shadow-comic"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <StatusChip status={order.status} />
                  <span className="truncate font-bold text-brand-deep">
                    {order.childName?.trim() || "Unnamed hero"}
                    {order.world ? ` — ${WORLD_LABELS[order.world as WorldId] ?? order.world}` : ""}
                    {order.length ? ` · ${LENGTH_LABELS[order.length] ?? order.length}` : ""}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-sm text-brand-deep/60">
                  {typeof order.amountTotalCents === "number" ? (
                    <span className="font-bold text-brand-deep">
                      {formatCents(order.amountTotalCents)}
                    </span>
                  ) : null}
                  <span>{formatAge(order.createdAt, now)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border-2 border-brand-deep px-3 py-1 text-xs font-bold transition-shadow hover:shadow-comic-sm ${
        active ? "bg-brand-deep text-brand-cream" : "bg-white text-brand-deep"
      }`}
      style={{ fontFamily: "var(--font-quicksand)" }}
    >
      {label}
    </Link>
  );
}
