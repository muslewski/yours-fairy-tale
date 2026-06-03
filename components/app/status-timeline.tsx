"use client";

/**
 * StatusTimeline — the production stepper at the heart of the dashboard.
 *
 * Renders the six production STAGES (lib/order-stages.ts) as a comic-styled
 * stepper: deep-ink-outlined circles joined by a connecting rail that fills up
 * to the order's current step. Each step is completed, active, or upcoming.
 *
 *   • completed — filled circle with a check, full-color rail behind it
 *   • active    — emphasized circle that gently pulses (motion), the rail
 *                 filling toward it
 *   • upcoming  — muted outline-only circle, dimmed label
 *
 * Motion is guarded by useReducedMotion(): when a parent prefers reduced
 * motion, nothing animates on its own — the active step is simply emphasized
 * statically.
 *
 * Layout is vertical on mobile (a stacked rail down the left) and horizontal on
 * desktop. For refunded / cancelled orders there is no journey to show, so we
 * render a quiet terminal note instead of the stepper.
 *
 * The component is a pure function of `status` (+ optional childName) — all the
 * decisions live in the tested lib/order-stages core.
 */

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import {
  STAGES,
  stageForStatus,
  messageForStatus,
  type OrderStatus,
} from "@/lib/order-stages";

interface StatusTimelineProps {
  status: OrderStatus;
  childName?: string;
  className?: string;
}

type StepState = "completed" | "active" | "upcoming";

export function StatusTimeline({
  status,
  childName,
  className,
}: StatusTimelineProps) {
  const reduce = useReducedMotion();
  const result = stageForStatus(status);

  // Off the happy path: a quiet, non-alarming note instead of the stepper.
  if ("terminal" in result) {
    const msg = messageForStatus(status, childName);
    return (
      <div
        className={cn(
          "rounded-2xl border-2 border-dashed border-brand-deep/40 bg-brand-cream px-5 py-4",
          className,
        )}
      >
        <p
          className="text-brand-deep/70"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          {msg.body}
        </p>
      </div>
    );
  }

  const activeIndex = result.activeIndex;
  // Fraction of the rail that should read as "done" — through the active step.
  const fillFraction =
    STAGES.length > 1 ? activeIndex / (STAGES.length - 1) : 1;

  return (
    <ol
      className={cn(
        // Vertical (stacked) on mobile, horizontal on md+.
        "relative flex flex-col gap-7 md:flex-row md:justify-between md:gap-2",
        className,
      )}
      aria-label="Production progress"
    >
      {/* Connecting rail — the muted track, with a colored fill up to active. */}
      {/* Vertical rail (mobile) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-5 top-5 bottom-5 w-[3px] -translate-x-1/2 rounded-full bg-brand-deep/15 md:hidden"
      >
        <RailFill vertical fraction={fillFraction} reduce={reduce} />
      </div>
      {/* Horizontal rail (desktop) — spans between the first and last circle. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-5 right-5 top-5 hidden h-[3px] -translate-y-1/2 rounded-full bg-brand-deep/15 md:block"
      >
        <RailFill fraction={fillFraction} reduce={reduce} />
      </div>

      {STAGES.map((stage, index) => {
        const state: StepState =
          index < activeIndex
            ? "completed"
            : index === activeIndex
              ? "active"
              : "upcoming";
        return (
          <li
            key={stage.key}
            className="relative z-10 flex items-center gap-4 md:w-0 md:flex-1 md:flex-col md:items-center md:gap-3 md:text-center"
          >
            <StepCircle
              index={index}
              state={state}
              reduce={reduce}
            />
            <span
              className={cn(
                "text-sm font-semibold leading-tight md:text-[0.8rem]",
                state === "upcoming"
                  ? "text-brand-deep/40"
                  : "text-brand-deep",
              )}
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The colored portion of the connecting rail, growing toward the active step. */
function RailFill({
  fraction,
  vertical = false,
  reduce,
}: {
  fraction: number;
  vertical?: boolean;
  reduce: boolean | null;
}) {
  const pct = `${Math.round(fraction * 100)}%`;
  const sizeKey = vertical ? "height" : "width";
  const initial = vertical ? { height: 0 } : { width: 0 };

  return (
    <motion.div
      className={cn(
        "rounded-full bg-brand-blue",
        vertical ? "absolute left-0 top-0 w-full" : "h-full",
      )}
      initial={reduce ? false : initial}
      animate={{ [sizeKey]: pct }}
      transition={
        reduce ? { duration: 0 } : { duration: 0.7, ease: "easeOut" }
      }
      style={reduce ? { [sizeKey]: pct } : undefined}
    />
  );
}

/** A single numbered / checked circle for one production stage. */
function StepCircle({
  index,
  state,
  reduce,
}: {
  index: number;
  state: StepState;
  reduce: boolean | null;
}) {
  const base =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-brand-deep font-bold";

  if (state === "completed") {
    return (
      <span
        className={cn(base, "bg-brand-yellow text-brand-deep shadow-comic-sm")}
        style={{ fontFamily: "var(--font-fredoka)" }}
        aria-label="Completed"
      >
        <CheckMark />
      </span>
    );
  }

  if (state === "active") {
    return (
      <motion.span
        className={cn(
          base,
          "bg-brand-blue text-brand-deep shadow-comic-sm",
        )}
        style={{ fontFamily: "var(--font-fredoka)" }}
        aria-current="step"
        animate={
          reduce
            ? undefined
            : {
                scale: [1, 1.08, 1],
                boxShadow: [
                  "3px 3px 0 var(--color-brand-deep)",
                  "4px 4px 0 var(--color-brand-deep)",
                  "3px 3px 0 var(--color-brand-deep)",
                ],
              }
        }
        transition={
          reduce
            ? undefined
            : { duration: 2.4, ease: "easeInOut", repeat: Infinity }
        }
      >
        {index + 1}
      </motion.span>
    );
  }

  // upcoming
  return (
    <span
      className={cn(base, "bg-white text-brand-deep/40")}
      style={{ fontFamily: "var(--font-fredoka)" }}
    >
      {index + 1}
    </span>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
