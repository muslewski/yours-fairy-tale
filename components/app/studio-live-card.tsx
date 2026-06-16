"use client";

/**
 * StudioLiveCard — the "In the studio now" hero shown on the order detail page
 * while an order is actively being made (in_production / revisions). The
 * auto-playing builder mascot, perched at sign-in scale, beside a live count-up
 * of real time in the studio (lib/studio-elapsed.ts from orders.inStudioSince),
 * with the ready-by date as a calm sub-line.
 *
 * Motion is guarded by useReducedMotion(): the mascot falls back to its still
 * frame (MascotImage handles that), the pulse stops, and the counter shows a
 * static days-granularity form instead of ticking. The ticking number is
 * aria-hidden; a stable sr-only sentence carries the fact to screen readers.
 *
 * Overdue (past promisedBy) is read from lib/delivery.ts and swaps the counter
 * for the existing gentle "taking a little longer" copy — no alarming big number.
 */
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { MascotImage } from "@/components/app/mascot-image";
import { countdownState, formatPromisedDate } from "@/lib/delivery";
import { heroName, type OrderStatus } from "@/lib/order-stages";
import {
  studioElapsed,
  formatStudioElapsed,
  formatStudioElapsedCoarse,
  formatStudioSince,
} from "@/lib/studio-elapsed";

export function StudioLiveCard({
  status,
  promisedBy,
  inStudioSince,
  createdAt,
  childName,
}: {
  status: OrderStatus;
  promisedBy: string | null;
  inStudioSince: string | null;
  createdAt: string;
  childName?: string;
}) {
  const reduce = useReducedMotion();
  const startISO = inStudioSince ?? createdAt;
  const { possessive } = heroName(childName);

  const state = countdownState({ status, promisedBy, createdAt, now: new Date() });
  const overdue = state.kind === "overdue";
  const promised = promisedBy && !overdue ? new Date(promisedBy) : null;

  return (
    <div className="mt-6 rounded-3xl border-2 border-brand-deep bg-white px-6 pb-6 pt-3 text-center shadow-comic">
      <MascotImage
        animatedSrc="/mascot/builder-360.webp"
        staticSrc="/mascot/builder-static.png"
        width={224}
        height={360}
        className="mx-auto -mt-14 h-32 w-auto drop-shadow-[4px_4px_0_color-mix(in_srgb,var(--color-brand-deep)_20%,transparent)]"
      />

      <div className="mt-1 flex items-center justify-center gap-2">
        <LivePulse reduce={reduce} />
        <span
          className="text-xl text-brand-deep"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          In the studio now
        </span>
      </div>

      {overdue ? (
        <p
          className="mx-auto mt-3 max-w-sm text-sm text-brand-deep/70"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          The final touches are taking a little longer than we hoped. It will be
          worth the wait.
        </p>
      ) : (
        <>
          <CraftingClock startISO={startISO} possessive={possessive} reduce={!!reduce} />
          {promised ? (
            <p
              className="mt-2 text-sm text-brand-deep/60"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              We expect it ready by {formatPromisedDate(promised)}.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

/** The "alive" dot beside the headline. Still under reduced motion. */
function LivePulse({ reduce }: { reduce: boolean | null }) {
  if (reduce) {
    return <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-brand-blue" />;
  }
  return (
    <motion.span
      aria-hidden
      className="h-2.5 w-2.5 rounded-full bg-brand-blue"
      animate={{ opacity: [1, 0.3, 1], scale: [1, 1.25, 1] }}
      transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity }}
    />
  );
}

/** The "crafting … for {elapsed}" line: ticks when motion is allowed, static otherwise. */
function CraftingClock({
  startISO,
  possessive,
  reduce,
}: {
  startISO: string;
  possessive: string;
  reduce: boolean;
}) {
  if (reduce) {
    const coarse = formatStudioElapsedCoarse(studioElapsed(startISO, new Date()));
    return (
      <p
        className="mt-3 text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        crafting {possessive} story for {coarse}
      </p>
    );
  }
  return <TickingClock startISO={startISO} possessive={possessive} />;
}

/** Updates every second on the client. First paint shows a stable placeholder
 *  (no hydration mismatch); the sr-only sentence is always present. */
function TickingClock({ startISO, possessive }: { startISO: string; possessive: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now ? formatStudioElapsed(studioElapsed(startISO, now)) : "…";

  return (
    <p className="mt-3 text-brand-deep">
      <span
        className="block text-[0.62rem] font-bold uppercase tracking-[0.13em] text-brand-deep/50"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        crafting {possessive} story for
      </span>
      <span
        aria-hidden
        className="block text-2xl tabular-nums"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        {elapsed}
      </span>
      <span className="sr-only">In the studio, crafting since {formatStudioSince(startISO)}.</span>
    </p>
  );
}
