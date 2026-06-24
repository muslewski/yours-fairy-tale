import type { Block } from "payload";

import { linkGroup } from "../fields/link";

export const Hero: Block = {
  slug: "hero",
  interfaceName: "HeroBlock",
  labels: { singular: "Hero", plural: "Heroes" },
  fields: [
    { name: "eyebrow", type: "text" },
    { name: "heading", type: "text", required: true },
    { name: "subcopy", type: "textarea" },
    {
      name: "background",
      type: "select",
      defaultValue: "cream",
      options: [
        { label: "Cream", value: "cream" },
        { label: "Yellow", value: "yellow" },
        { label: "Blue", value: "blue" },
        { label: "Deep", value: "deep" },
      ],
    },
    {
      name: "ctas",
      type: "array",
      maxRows: 2,
      labels: { singular: "CTA", plural: "CTAs" },
      fields: [
        linkGroup(),
        {
          name: "variant",
          type: "select",
          defaultValue: "primary",
          options: [
            { label: "Primary", value: "primary" },
            { label: "Secondary", value: "secondary" },
          ],
        },
      ],
    },
  ],
};
