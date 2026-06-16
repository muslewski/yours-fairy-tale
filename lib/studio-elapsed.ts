/**
 * Studio-elapsed — the customer dashboard's "in the studio for …" count-up, as
 * pure data. No React, no DB. Counts UP from when an order entered production
 * (orders.inStudioSince), the sincere counterpart to the days-granularity
 * delivery COUNTDOWN in lib/delivery.ts. Unit-tested in
 * tests/lib/studio-elapsed.test.ts.
 */

export interface Elapsed {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

/** Elapsed time from `startISO` to `now`, never negative; invalid start → zero. */
export function studioElapsed(startISO: string, now: Date): Elapsed {
  const start = new Date(startISO).getTime();
  const ms = Number.isNaN(start) ? 0 : Math.max(0, now.getTime() - start);
  const totalSec = Math.floor(ms / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    totalMs: ms,
  };
}

function two(n: number): string {
  return String(n).padStart(2, "0");
}

/** Ticking form: "2d 06h 14m 32s", shedding leading empty segments. */
export function formatStudioElapsed(e: Elapsed): string {
  if (e.days > 0) return `${e.days}d ${two(e.hours)}h ${two(e.minutes)}m ${two(e.seconds)}s`;
  if (e.hours > 0) return `${e.hours}h ${two(e.minutes)}m ${two(e.seconds)}s`;
  if (e.minutes > 0) return `${e.minutes}m ${two(e.seconds)}s`;
  return `${e.seconds}s`;
}

/** Calm static form for reduced-motion + screen readers: "2 days" / "about 5 hours". */
export function formatStudioElapsedCoarse(e: Elapsed): string {
  if (e.days >= 1) return `${e.days} ${e.days === 1 ? "day" : "days"}`;
  if (e.hours >= 1) return `about ${e.hours} ${e.hours === 1 ? "hour" : "hours"}`;
  return "under an hour";
}

/** "June 14" — UTC so the server timezone never shifts the date. */
export function formatStudioSince(startISO: string): string {
  const d = new Date(startISO);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}
