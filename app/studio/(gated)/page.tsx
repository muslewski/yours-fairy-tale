/**
 * /studio — the dashboard: revenue cards, the needs-attention queue, the
 * in-the-works list, and quick links. Pure read; all numbers come from the
 * unit-tested workflow core.
 */
import Link from "next/link";

import { getAllOrders } from "@/lib/studio-data";
import {
  computeRevenueTotals,
  needsAttention,
  inTheWorks,
  formatCents,
  formatAge,
  STATUS_CHIPS,
} from "@/lib/studio-workflow";
import { StatusChip } from "@/components/studio/status-chip";
import { WORLD_LABELS, type WorldId } from "@/lib/worlds";
import { LENGTH_LABELS } from "@/lib/order-options";

export default async function StudioDashboardPage() {
  const orders = await getAllOrders();
  const now = new Date();
  const totals = computeRevenueTotals(orders, now);
  const attention = needsAttention(orders);
  const moving = inTheWorks(orders);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Studio
        </h1>
        <p className="mt-1 text-brand-deep/70">Here is how the storybook shop is doing.</p>
      </header>

      <section aria-label="Revenue" className="mb-3 grid gap-4 sm:grid-cols-3">
        <RevenueCard label="All time" window={totals.allTime} highlight />
        <RevenueCard label="This month" window={totals.thisMonth} />
        <RevenueCard label="Last 30 days" window={totals.last30Days} />
      </section>
      <p className="mb-8 text-xs text-brand-deep/50">
        {totals.hasUnrecordedAmounts
          ? "Older orders without recorded amounts are not counted. Refunded and disputed orders are left out."
          : "Refunded and disputed orders are left out."}
      </p>

      <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section aria-label="Needs your attention">
          <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
            Needs your attention{" "}
            {attention.length > 0 ? (
              <span className="ml-1 inline-block rounded-full bg-brand-pink px-2.5 py-0.5 align-middle text-sm font-bold text-white">
                {attention.length}
              </span>
            ) : null}
          </h2>

          {attention.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border-2 border-brand-deep bg-white p-8 text-center shadow-comic">
              {/* eslint-disable-next-line @next/next/no-img-element -- animated webp; next/image will not animate it */}
              <img
                src="/mascot/builder-360.webp"
                alt=""
                width={180}
                height={180}
                loading="lazy"
                className="h-44 w-auto"
              />
              <p className="mt-2 font-bold text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                All caught up
              </p>
              <p className="mt-1 text-sm text-brand-deep/60">Nothing needs you right now.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {attention.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/studio/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic transition-shadow hover:shadow-comic-lg"
                  >
                    <div>
                      <StatusChip status={order.status} />
                      <p className="mt-2 font-bold text-brand-deep">
                        {order.childName?.trim() || "Unnamed hero"}
                        {order.world ? ` — ${WORLD_LABELS[order.world as WorldId] ?? order.world}` : ""}
                        {order.length ? ` · ${LENGTH_LABELS[order.length] ?? order.length}` : ""}
                      </p>
                      {order.status === "revisions" && order.revisionNote ? (
                        <p className="mt-1 line-clamp-1 text-sm text-brand-deep/60">
                          &ldquo;{order.revisionNote}&rdquo;
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-brand-deep/50">
                        {STATUS_CHIPS[order.status].label.toLowerCase()} · {formatAge(order.createdAt, now)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {typeof order.amountTotalCents === "number" ? (
                        <p className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                          {formatCents(order.amountTotalCents)}
                        </p>
                      ) : null}
                      <span aria-hidden="true" className="text-brand-deep/50">→</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-8">
          <section aria-label="In the works">
            <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              In the works
            </h2>
            <div className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic">
              {moving.length === 0 ? (
                <p className="text-sm text-brand-deep/60">Nothing in motion right now.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-dashed divide-brand-deep/20">
                  {moving.map((order) => (
                    <li key={order.id}>
                      <Link
                        href={`/studio/orders/${order.id}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:underline"
                      >
                        <span className="font-bold text-brand-deep">
                          {order.childName?.trim() || "Unnamed hero"}
                          {order.world ? ` — ${WORLD_LABELS[order.world as WorldId] ?? order.world}` : ""}
                        </span>
                        <span className="text-brand-deep/60">{STATUS_CHIPS[order.status].label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-label="Quick links">
            <h2 className="mb-4 text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Quick links
            </h2>
            <div className="rounded-3xl bg-brand-deep p-5 text-sm font-bold text-brand-cream">
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Stripe dashboard (opens in a new tab)"
                className="block py-1.5 underline-offset-4 hover:underline"
              >
                Stripe dashboard ↗
              </a>
              <a
                href="/admin"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Payload admin (opens in a new tab)"
                className="block py-1.5 underline-offset-4 hover:underline"
              >
                Payload admin ↗
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function RevenueCard({
  label,
  window: w,
  highlight = false,
}: {
  label: string;
  window: { cents: number; count: number };
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border-2 border-brand-deep p-5 shadow-comic ${
        highlight ? "bg-brand-yellow" : "bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-brand-deep/60">{label}</p>
      <p className="mt-1 text-3xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        {formatCents(w.cents)}
      </p>
      <p className="mt-0.5 text-xs text-brand-deep/60">
        {w.count === 1 ? "1 film" : `${w.count} films`}
      </p>
    </div>
  );
}
