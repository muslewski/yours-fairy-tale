/**
 * Hand-authored types for the CMS `pages` collection + its blocks.
 *
 * The repo deliberately does NOT commit `payload-types.ts` (the Payload CLI
 * type generation is unreliable on this stack, so prod builds without it and
 * the Payload generics degrade to loose types — no app code imports it). To
 * keep the Pages feature self-sufficient and prod-faithful, the block/page
 * shapes the renderers and source layer need are declared here instead.
 *
 * These mirror the generated interfaces 1:1 (verified against a real
 * `generate:types` run); keep them in sync if the block configs change.
 */

/** Lexical serialized editor state (structural — the RichText converter
 *  validates the real shape at render). */
export type LexicalContent = { root: unknown; [k: string]: unknown };

/** A populated site-media upload (depth >= 1). */
export type MediaDoc = {
  url?: string | null;
  alt?: string | null;
  mimeType?: string | null;
};

export type LinkValue = {
  label: string;
  url: string;
  newTab?: boolean | null;
};

export type HeroBlock = {
  blockType: "hero";
  eyebrow?: string | null;
  heading: string;
  subcopy?: string | null;
  background?: ("cream" | "yellow" | "blue" | "deep") | null;
  ctas?:
    | {
        link: LinkValue;
        variant?: ("primary" | "secondary") | null;
        id?: string | null;
      }[]
    | null;
  id?: string | null;
  blockName?: string | null;
};

export type RichTextBlock = {
  blockType: "richText";
  content: LexicalContent;
  id?: string | null;
  blockName?: string | null;
};

export type MediaBlock = {
  blockType: "mediaBlock";
  media: string | MediaDoc;
  caption?: string | null;
  aspect?: ("video" | "portrait") | null;
  id?: string | null;
  blockName?: string | null;
};

export type CTABlock = {
  blockType: "cta";
  heading: string;
  subcopy?: string | null;
  background?: ("yellow" | "pink" | "blue" | "deep") | null;
  buttons?:
    | {
        link: LinkValue;
        id?: string | null;
      }[]
    | null;
  id?: string | null;
  blockName?: string | null;
};

export type PageBlock = HeroBlock | RichTextBlock | MediaBlock | CTABlock;

export type PageDoc = {
  id: string;
  title: string;
  slug: string;
  layout?: PageBlock[] | null;
  meta?: {
    title?: string | null;
    description?: string | null;
    image?: (string | null) | MediaDoc;
  } | null;
  updatedAt: string;
  createdAt: string;
  _status?: ("draft" | "published") | null;
};
