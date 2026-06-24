import type { PageBlock } from "@/lib/pages-types";

import { HeroRender } from "./hero";
import { RichTextRender } from "./rich-text";
import { MediaRender } from "./media";
import { CTARender } from "./cta";

export function RenderBlocks({ blocks }: { blocks?: PageBlock[] | null }) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block, i) => {
        const key = block.id ?? i;
        switch (block.blockType) {
          case "hero":
            return <HeroRender key={key} block={block} />;
          case "richText":
            return <RichTextRender key={key} block={block} />;
          case "mediaBlock":
            return <MediaRender key={key} block={block} />;
          case "cta":
            return <CTARender key={key} block={block} />;
          default:
            return null; // forward-compat: unknown block types render nothing
        }
      })}
    </>
  );
}
