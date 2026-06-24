import type { CollectionConfig } from "payload";

import { adminOnly } from "@/access/adminOnly";
import { isReservedSlug, normalizeSlug } from "@/lib/reserved-slugs";
import { Hero } from "@/blocks/Hero/config";
import { RichTextBlock } from "@/blocks/RichText/config";
import { MediaBlock } from "@/blocks/Media/config";
import { CTA } from "@/blocks/CTA/config";
import { revalidatePage, revalidatePageDelete } from "./Pages/hooks/revalidate";

export const Pages: CollectionConfig = {
  slug: "pages",
  labels: { singular: "Page", plural: "Pages" },
  access: {
    // Public reads see published only; an authenticated admin sees drafts too.
    read: ({ req }) => (req.user ? true : { _status: { equals: "published" } }),
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
  },
  versions: { drafts: { autosave: false } },
  hooks: {
    afterChange: [revalidatePage],
    afterDelete: [revalidatePageDelete],
  },
  fields: [
    { name: "title", type: "text", required: true },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        position: "sidebar",
        description: 'URL after the domain, e.g. "about".',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => (typeof value === "string" ? normalizeSlug(value) : value),
        ],
      },
      validate: (value: string | string[] | null | undefined) => {
        if (typeof value !== "string" || value.length === 0) {
          return "A slug is required.";
        }
        if (isReservedSlug(value)) {
          return `"${value}" is reserved by an existing route. Pick another slug.`;
        }
        return true;
      },
    },
    {
      name: "layout",
      type: "blocks",
      minRows: 0,
      blocks: [Hero, RichTextBlock, MediaBlock, CTA],
    },
  ],
};
