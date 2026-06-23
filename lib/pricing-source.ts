import "server-only";

import { unstable_cache } from "next/cache";

import { getPayloadClient } from "@/lib/payload";
import { DEFAULT_PRICING, type Pricing } from "@/lib/pricing";

/**
 * Server-only resolver for the live pricing model.
 *
 * Reads the Payload `pricing` Global (the admin-editable source) and maps it to
 * the shared `Pricing` shape. Falls back to `DEFAULT_PRICING` whenever the
 * global is unseeded/empty or the read throws, so a DB hiccup can never break
 * the configurator or — critically — the checkout charge.
 *
 * Never import this (or getPayloadClient) into a "use client" module.
 */

// Loose view of the global doc — the generated `Pricing` global type only
// exists after `npm run generate:types`, so we map fields defensively here.
type PricingGlobalDoc = {
  lengths?: Array<{ id: string; label: string; minutes: number; price: number; note?: string | null }>;
  details?: Array<{ id: string; label: string; multiplier: number; note?: string | null }>;
  addOns?: Array<{ id: string; label: string; price: number; note?: string | null }>;
  extraMinutePrice?: number;
  maxExtraMinutes?: number;
};

export async function readPricing(): Promise<Pricing> {
  try {
    const payload = await getPayloadClient();
    // Cast around the slug union: it resolves to "pricing" only after types are
    // generated; the runtime call is unaffected.
    const findGlobal = payload.findGlobal as (args: { slug: string }) => Promise<PricingGlobalDoc>;
    const g = await findGlobal({ slug: "pricing" });

    if (
      !g ||
      !Array.isArray(g.lengths) ||
      g.lengths.length === 0 ||
      !Array.isArray(g.details) ||
      !Array.isArray(g.addOns) ||
      typeof g.extraMinutePrice !== "number" ||
      typeof g.maxExtraMinutes !== "number"
    ) {
      return DEFAULT_PRICING;
    }

    return {
      lengths: g.lengths.map((l) => ({
        id: l.id,
        label: l.label,
        minutes: l.minutes,
        price: l.price,
        note: l.note ?? "",
      })),
      details: g.details.map((d) => ({
        id: d.id,
        label: d.label,
        multiplier: d.multiplier,
        note: d.note ?? "",
      })),
      addOns: g.addOns.map((a) => ({
        id: a.id,
        label: a.label,
        price: a.price,
        note: a.note ?? "",
      })),
      extraMinutePrice: g.extraMinutePrice,
      maxExtraMinutes: g.maxExtraMinutes,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

/**
 * Cached entry point. Tagged "pricing"; the Global's afterChange hook calls
 * `revalidateTag("pricing")` so a studio edit propagates without a deploy.
 */
export const getPricing = unstable_cache(readPricing, ["pricing-global"], {
  tags: ["pricing"],
});
