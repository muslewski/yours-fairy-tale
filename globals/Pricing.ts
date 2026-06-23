import type { GlobalConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";
import { DEFAULT_PRICING } from "@/lib/pricing";

/**
 * Admin-editable pricing for the video configurator.
 *
 * Mirrors the `Pricing` shape in lib/pricing.ts 1:1. Read by getPricing()
 * (lib/pricing-source.ts) server-side for both the configurator display and the
 * authoritative checkout charge; `DEFAULT_PRICING` is the fallback when this is
 * unseeded/unreadable. The `defaultValue`s below seed the panel with the current
 * live numbers, so an admin opens it pre-filled and the fallback equals the seed.
 *
 * Access: read is public (configurator + checkout need it); update is staff-only.
 */
export const Pricing: GlobalConfig = {
  slug: "pricing",
  label: "Pricing",
  access: {
    read: () => true,
    update: adminOnly,
  },
  admin: {
    description:
      "Base prices for the video configurator. Edits go live without a deploy.",
  },
  hooks: {
    afterChange: [
      async () => {
        // Bust the cached getPricing() read so a save propagates without a
        // deploy. Dynamic import keeps next/cache out of the Payload CLI graph
        // (migrate / generate:types load this config outside a request).
        const { revalidateTag } = await import("next/cache");
        // Next 16: revalidateTag takes (tag, profile). "max" invalidates the
        // longest-lived cache entries carrying this tag.
        revalidateTag("pricing", "max");
      },
    ],
  },
  fields: [
    {
      name: "lengths",
      type: "array",
      label: "Length tiers",
      defaultValue: DEFAULT_PRICING.lengths,
      fields: [
        {
          name: "id",
          type: "text",
          required: true,
          admin: {
            description:
              "Stable key (short / medium / long). Do not rename — historical orders reference it.",
          },
        },
        { name: "label", type: "text", required: true },
        { name: "minutes", type: "number", required: true, min: 1 },
        {
          name: "price",
          type: "number",
          required: true,
          min: 0,
          admin: { description: "Base price in whole US dollars." },
        },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "details",
      type: "array",
      label: "Detail levels",
      defaultValue: DEFAULT_PRICING.details,
      fields: [
        { name: "id", type: "text", required: true },
        { name: "label", type: "text", required: true },
        {
          name: "multiplier",
          type: "number",
          required: true,
          min: 0,
          admin: {
            description: "Surcharge multiplier on the subtotal (1 = no surcharge).",
          },
        },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "addOns",
      type: "array",
      label: "Add-ons",
      defaultValue: DEFAULT_PRICING.addOns,
      fields: [
        { name: "id", type: "text", required: true },
        { name: "label", type: "text", required: true },
        {
          name: "price",
          type: "number",
          required: true,
          min: 0,
          admin: { description: "Price in whole US dollars." },
        },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "extraMinutePrice",
      type: "number",
      required: true,
      min: 0,
      defaultValue: DEFAULT_PRICING.extraMinutePrice,
      admin: { description: "US dollars added per extra minute." },
    },
    {
      name: "maxExtraMinutes",
      type: "number",
      required: true,
      min: 0,
      defaultValue: DEFAULT_PRICING.maxExtraMinutes,
      admin: { description: "Maximum extra minutes a buyer can add." },
    },
  ],
};
