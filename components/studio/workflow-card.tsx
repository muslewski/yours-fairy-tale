"use client";

/**
 * WorkflowCard — current status, the natural next-step buttons, and the
 * set-any-status fallback. Calls the setOrderStatus server action; the
 * guardrails live server-side — a rejected change shows its calm message here.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setOrderStatus } from "@/lib/studio-actions";
import type { OrderStatus } from "@/lib/order-stages";

interface NextStep {
  label: string;
  to: OrderStatus;
}

export function WorkflowCard({
  orderId,
  status,
  statusLabel,
  nextSteps,
  allStatuses,
  statusLabels,
}: {
  orderId: string;
  status: OrderStatus;
  statusLabel: string;
  nextSteps: NextStep[];
  allStatuses: OrderStatus[];
  statusLabels: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState<OrderStatus | "">("");

  function applyStatus(to: OrderStatus) {
    setError("");
    startTransition(async () => {
      const result = await setOrderStatus(orderId, to);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      aria-label="Workflow"
      className="rounded-3xl bg-brand-deep p-5 text-brand-cream"
    >
      <h2 className="text-lg" style={{ fontFamily: "var(--font-fredoka)" }}>
        Workflow
      </h2>
      <p className="mt-1 text-sm text-brand-cream/80">
        This order is at <span className="font-bold">{statusLabel}</span>.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {nextSteps.map((step, index) => (
          <button
            key={step.to}
            type="button"
            disabled={pending}
            onClick={() => applyStatus(step.to)}
            className={
              index === 0
                ? "rounded-full border-2 border-brand-deep bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-60"
                : "rounded-full border-2 border-brand-cream bg-transparent px-5 py-2.5 text-sm font-bold text-brand-cream hover:bg-brand-cream/10 disabled:opacity-60"
            }
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {step.label}
          </button>
        ))}
        {nextSteps.length === 0 ? (
          <p className="text-sm text-brand-cream/60">
            Nothing for the studio to do at this step.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-brand-yellow">
          {error}
        </p>
      ) : null}

      <div className="mt-5 border-t border-brand-cream/20 pt-4">
        <label className="flex flex-col gap-1.5 text-xs font-bold text-brand-cream/70">
          Set any status
          <div className="flex gap-2">
            <select
              value={fallback}
              onChange={(e) => setFallback(e.target.value as OrderStatus | "")}
              className="w-full rounded-xl border-2 border-brand-cream/40 bg-brand-deep px-3 py-2 text-sm font-semibold text-brand-cream"
            >
              <option value="">Choose a status…</option>
              {allStatuses
                .filter((s) => s !== status)
                .map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={pending || !fallback}
              onClick={() => fallback && applyStatus(fallback)}
              className="shrink-0 rounded-xl border-2 border-brand-cream/40 px-3 py-2 text-sm font-bold text-brand-cream hover:bg-brand-cream/10 disabled:opacity-50"
            >
              Set
            </button>
          </div>
        </label>
      </div>
    </section>
  );
}
