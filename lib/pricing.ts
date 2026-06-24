/**
 * Shared pricing model for the personalized video configurator.
 *
 * This is the SINGLE SOURCE OF TRUTH for prices. Both the client configurator
 * (display only) and the server checkout route (authoritative charge amount)
 * import from here, so the number a parent sees is the number they pay.
 *
 * No React, no DOM, no network — safe to import on the server and unit-test.
 */

export type LengthTier = {
  id: string;
  label: string;
  minutes: number;
  /** Base price in whole US dollars. */
  price: number;
  note: string;
};

export type DetailLevel = {
  id: string;
  label: string;
  /** Surcharge multiplier applied to the subtotal (1 = no surcharge). */
  multiplier: number;
  note: string;
  /** Resolved public URL of the preview image (site-media). Optional. */
  image?: string;
  /** Headline for the preview panel. Optional; falls back to label. */
  title?: string;
  /** Short paragraph describing what this tier captures. Optional. */
  description?: string;
};

export type AddOn = {
  id: string;
  label: string;
  /** Price in whole US dollars. */
  price: number;
  note: string;
};

export const LENGTHS: LengthTier[] = [
  { id: "short", label: "Short", minutes: 3, price: 180, note: "A short and sweet first story." },
  { id: "medium", label: "Medium", minutes: 5, price: 290, note: "Room for a fuller adventure." },
  { id: "long", label: "Long", minutes: 10, price: 580, note: "The full journey, start to finish." },
];

export const DETAILS: DetailLevel[] = [
  {
    id: "basic",
    label: "Basic",
    multiplier: 1,
    note: "Clean, charming animation with all the essentials.",
    title: "The essentials, beautifully done",
    description:
      "Clean, charming animation with your child as the hero. Their name, their world, their story, told simply and warmly.",
  },
  {
    id: "detailed",
    label: "Detailed",
    multiplier: 1,
    note: "Richer backgrounds and more movement in every scene.",
    title: "Their world, in the details",
    description:
      "We carry through the little things that make it theirs: the color of a favorite cup, a beloved toy, the patterns on their clothes.",
  },
  {
    id: "premium",
    label: "Premium",
    multiplier: 1,
    note: "Our finest work, with lush detail in every frame.",
    title: "Every little detail, cherished",
    description:
      "Our finest work. The fine touches come along too, from a tiny necklace to a favorite watch, so every frame feels made just for them.",
  },
];

export const ADDONS: AddOn[] = [
  { id: "narration", label: "Custom narration", price: 10, note: "A warm voice reads the story aloud." },
  { id: "music", label: "Original music", price: 10, note: "A score written to match their adventure." },
  { id: "master", label: "Physical DVD", price: 25, note: "Their film on a real DVD, mailed to you to keep and watch again and again." },
];

/**
 * The full pricing model as one object. The Payload `pricing` Global is an
 * editable copy of this shape; `DEFAULT_PRICING` below is the fallback used when
 * the global is unseeded or unreadable (see lib/pricing-source.ts).
 */
export type Pricing = {
  lengths: LengthTier[];
  details: DetailLevel[];
  addOns: AddOn[];
  /** Each extra minute beyond the base length adds this many US dollars. */
  extraMinutePrice: number;
  maxExtraMinutes: number;
};

/** The built-in fallback — the values that ship in code (current live prices). */
export const DEFAULT_PRICING: Pricing = {
  lengths: LENGTHS,
  details: DETAILS,
  addOns: ADDONS,
  extraMinutePrice: 55,
  maxExtraMinutes: 30,
};

/** Each extra minute beyond the base length adds this many US dollars. */
export const EXTRA_MINUTE_PRICE = DEFAULT_PRICING.extraMinutePrice;
export const MAX_EXTRA_MINUTES = DEFAULT_PRICING.maxExtraMinutes;

export type OrderSelections = {
  length: string;
  detail: string;
  extraMinutes: number;
  addOns: string[];
};

/**
 * Validate a set of selections and return the resolved tier/level/add-ons.
 * Throws a descriptive Error on any unknown id or out-of-range minutes so the
 * checkout route can answer with a 400 and never price an invalid order.
 */
function resolve(
  sel: OrderSelections,
  pricing: Pricing,
): {
  tier: LengthTier;
  level: DetailLevel;
  chosenAddOns: AddOn[];
} {
  const tier = pricing.lengths.find((o) => o.id === sel.length);
  if (!tier) {
    throw new Error(`Unknown length: ${JSON.stringify(sel.length)}`);
  }

  const level = pricing.details.find((o) => o.id === sel.detail);
  if (!level) {
    throw new Error(`Unknown detail level: ${JSON.stringify(sel.detail)}`);
  }

  if (
    typeof sel.extraMinutes !== "number" ||
    !Number.isInteger(sel.extraMinutes) ||
    sel.extraMinutes < 0 ||
    sel.extraMinutes > pricing.maxExtraMinutes
  ) {
    throw new Error(
      `extraMinutes must be an integer between 0 and ${pricing.maxExtraMinutes}, got ${JSON.stringify(sel.extraMinutes)}`,
    );
  }

  if (!Array.isArray(sel.addOns)) {
    throw new Error("addOns must be an array of add-on ids.");
  }

  const chosenAddOns = sel.addOns.map((id) => {
    const addOn = pricing.addOns.find((o) => o.id === id);
    if (!addOn) {
      throw new Error(`Unknown add-on: ${JSON.stringify(id)}`);
    }
    return addOn;
  });

  return { tier, level, chosenAddOns };
}

/**
 * The authoritative price, in CENTS. Mirrors the configurator math exactly:
 *   subtotal  = tier.price + extraMinutes * EXTRA_MINUTE_PRICE + sum(addOns)
 *   surcharge = round(subtotal * (multiplier - 1))
 *   total     = subtotal + surcharge   (whole dollars)
 * then converted to cents.
 */
export function computeTotalCents(sel: OrderSelections, pricing: Pricing = DEFAULT_PRICING): number {
  const { tier, level, chosenAddOns } = resolve(sel, pricing);

  const minutesCost = sel.extraMinutes * pricing.extraMinutePrice;
  const addOnsCost = chosenAddOns.reduce((s, o) => s + o.price, 0);
  const subtotal = tier.price + minutesCost + addOnsCost;
  const surcharge = Math.round(subtotal * (level.multiplier - 1));
  const totalDollars = subtotal + surcharge;

  return totalDollars * 100;
}

/**
 * A human-readable one-liner for the Stripe line-item description, e.g.
 * "Medium film · 7 min · Premium detail · Custom narration".
 */
export function summarizeSelections(sel: OrderSelections, pricing: Pricing = DEFAULT_PRICING): string {
  const { tier, level, chosenAddOns } = resolve(sel, pricing);

  const totalMinutes = tier.minutes + sel.extraMinutes;
  const parts = [
    `${tier.label} film`,
    `${totalMinutes} min`,
    `${level.label} detail`,
  ];

  if (chosenAddOns.length > 0) {
    parts.push(chosenAddOns.map((o) => o.label).join(", "));
  }

  return parts.join(" · ");
}
