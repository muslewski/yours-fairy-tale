import type { Block } from "payload";

import { linkGroup } from "../fields/link";

export const CTA: Block = {
  slug: "cta",
  interfaceName: "CTABlock",
  labels: { singular: "Call to action", plural: "Calls to action" },
  fields: [
    { name: "heading", type: "text", required: true },
    { name: "subcopy", type: "textarea" },
    {
      name: "background",
      type: "select",
      defaultValue: "yellow",
      options: [
        { label: "Yellow", value: "yellow" },
        { label: "Pink", value: "pink" },
        { label: "Blue", value: "blue" },
        { label: "Deep", value: "deep" },
      ],
    },
    {
      name: "buttons",
      type: "array",
      maxRows: 2,
      labels: { singular: "Button", plural: "Buttons" },
      fields: [linkGroup()],
    },
  ],
};
