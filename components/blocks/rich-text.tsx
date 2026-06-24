import { RichText } from "@payloadcms/richtext-lexical/react";

import type { RichTextBlock } from "@/lib/pages-types";

export function RichTextRender({ block }: { block: RichTextBlock }) {
  if (!block.content) return null;
  return (
    <section className="bg-brand-cream px-6 py-16">
      <div className="prose mx-auto max-w-2xl font-[family-name:var(--font-quicksand)] text-brand-deep">
        {/* The converter validates the real lexical shape at render. */}
        <RichText data={block.content as never} />
      </div>
    </section>
  );
}
