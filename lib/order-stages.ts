/**
 * Order stages — the production journey, as pure data.
 *
 * This is the DOM-free, testable core behind the customer dashboard's
 * production timeline. It answers three questions for a given order status:
 *
 *   1. STAGES            — what are the six steps of making the video, in order?
 *   2. stageForStatus()  — which step is this order on right now? (or is it off
 *                          the happy path entirely — refunded / cancelled?)
 *   3. messageForStatus()— what do we gently tell the parent at this moment?
 *
 * Copy is parent-facing and runs through the brand-voice guide: calm, warm,
 * sincere, American English, sentence case, no hype, no em-dashes, exclamation
 * points kept rare. The child is the hero; the parent is the audience.
 *
 * Tested in tests/app/order-stages.test.ts (no DOM, no DB).
 */

/** The order status values, mirrored from the Orders collection `status` field. */
export type OrderStatus =
  | "paid"
  | "awaiting_assets"
  | "in_production"
  | "proof_ready"
  | "revisions"
  | "approved"
  | "delivered"
  | "refunded"
  | "cancelled";

/** A single step in the production journey, in display order. */
export interface Stage {
  /** Stable machine key. */
  key: "received" | "studio" | "preview" | "finishing" | "ready";
  /** Short label shown beneath the step. */
  label: string;
}

/**
 * The five steps of making a video, in order. The timeline renders one circle
 * per stage; `stageForStatus` says which one is active.
 *
 * NOTE: there is no longer a dedicated "Add your photos" step. Photos are
 * collected in the configurator BEFORE checkout (see the photos-before-checkout
 * flow), so an order arrives already carrying them and goes straight to the
 * studio. If an order has no photos yet (`awaiting_assets`), adding them is an
 * action on the "Order received" step, not a milestone of its own.
 */
export const STAGES: readonly Stage[] = [
  { key: "received", label: "Order received" },
  { key: "studio", label: "In the studio" },
  { key: "preview", label: "Your preview" },
  { key: "finishing", label: "Final touches" },
  { key: "ready", label: "Ready to watch" },
] as const;

/** The order is on the happy path, sitting at one of the six STAGES. */
export interface ActiveStage {
  activeIndex: number;
}

/** The order has left the happy path — there is no timeline to show. */
export interface TerminalStage {
  terminal: "refunded" | "cancelled";
}

export type StageResult = ActiveStage | TerminalStage;

/**
 * Map an order status to its place in the journey.
 *
 * Happy-path statuses resolve to an `activeIndex` into STAGES. `paid` and
 * `awaiting_assets` both sit at "Order received" — the order is in, and (for
 * `awaiting_assets`) photos are the outstanding action on that step, not a
 * separate milestone. `proof_ready` and `revisions` both sit at "Your preview" —
 * a revision is still a conversation about the preview, not a step backward.
 * `refunded` and `cancelled` return a terminal sentinel: these orders are off
 * the happy path and the dashboard shows a quiet note instead of a stepper.
 */
export function stageForStatus(status: OrderStatus): StageResult {
  switch (status) {
    case "paid":
    case "awaiting_assets":
      return { activeIndex: 0 };
    case "in_production":
      return { activeIndex: 1 };
    case "proof_ready":
    case "revisions":
      return { activeIndex: 2 };
    case "approved":
      return { activeIndex: 3 };
    case "delivered":
      return { activeIndex: 4 };
    case "refunded":
      return { terminal: "refunded" };
    case "cancelled":
      return { terminal: "cancelled" };
  }
}

/** A parent-facing message for a given moment in production. */
export interface StatusMessage {
  headline: string;
  body: string;
}

/**
 * Resolve the child's name into a possessive-friendly subject. With a name we
 * say "Mia's"; without one we fall back to a warm, name-free phrase so the copy
 * always reads naturally and never leaks a placeholder.
 */
function heroName(childName?: string): { possessive: string; subject: string } {
  if (childName && childName.trim().length > 0) {
    const name = childName.trim();
    return { possessive: `${name}'s`, subject: name };
  }
  return { possessive: "your child's", subject: "your child" };
}

/**
 * The contextual headline + body shown beside the timeline for each status.
 * Optionally interpolates the child's name. Calm and reassuring throughout —
 * the wait is days to weeks, and this copy is what carries the parent through
 * it.
 */
export function messageForStatus(
  status: OrderStatus,
  childName?: string,
): StatusMessage {
  const { possessive, subject } = heroName(childName);

  switch (status) {
    case "paid":
      return {
        headline: "Your order is in",
        body: `Thank you. We have everything we need to begin. Photos are the next step, so we can give the hero ${possessive} real likeness.`,
      };
    case "awaiting_assets":
      return {
        headline: "We are ready for photos",
        body: `Add a few photos of ${subject} so we can begin. A handful of clear, well-lit pictures is all we need to start animating.`,
      };
    case "in_production":
      return {
        headline: "In the studio",
        body: `We are putting ${possessive} story together right now, scene by scene. This part takes a little time, and it is worth it. We will email you the moment your preview is ready.`,
      };
    case "proof_ready":
      return {
        headline: "Your preview is ready",
        body: `Take a look at ${possessive} story so far. Watch it through, then let us know if anything should change before we finish.`,
      };
    case "revisions":
      return {
        headline: "We are making your changes",
        body: `Thank you for the notes. We are updating ${possessive} story now, and we will share a fresh preview soon.`,
      };
    case "approved":
      return {
        headline: "Adding the final touches",
        body: `Everything is approved. We are polishing the last details and preparing ${possessive} video in HD. Nearly there.`,
      };
    case "delivered":
      return {
        headline: `${capitalize(possessive)} fairy tale is ready`,
        body: `It is finished. Settle in and watch ${possessive} very own story together, again and again.`,
      };
    case "refunded":
      return {
        headline: "This order was refunded",
        body: "We have refunded this order in full. If you would like to start a new story, we would love to make one for you.",
      };
    case "cancelled":
      return {
        headline: "This order was cancelled",
        body: "This order has been cancelled. If you have any questions, or you would like to begin again, we are here to help.",
      };
  }
}

/** Capitalize the first letter, leaving the rest untouched (for possessives). */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
