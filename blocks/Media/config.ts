import type { Block } from "payload";

export const MediaBlock: Block = {
  slug: "mediaBlock",
  interfaceName: "MediaBlock",
  labels: { singular: "Media", plural: "Media" },
  fields: [
    { name: "media", type: "upload", relationTo: "site-media", required: true },
    { name: "caption", type: "text" },
    {
      name: "aspect",
      type: "select",
      defaultValue: "video",
      options: [
        { label: "Landscape 16:9", value: "video" },
        { label: "Portrait 9:16", value: "portrait" },
      ],
    },
  ],
};
