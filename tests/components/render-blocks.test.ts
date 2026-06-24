import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { RenderBlocks } from "@/components/blocks/render-blocks";
import type { PageBlock } from "@/lib/pages-types";

describe("RenderBlocks", () => {
  it("renders known blocks in order and skips unknown types", () => {
    const blocks = [
      { blockType: "hero", heading: "First", background: "cream" },
      { blockType: "cta", heading: "Second", background: "yellow" },
      { blockType: "totallyUnknown" },
    ] as unknown as PageBlock[];

    const html = renderToStaticMarkup(createElement(RenderBlocks, { blocks }));

    expect(html).toContain("First");
    expect(html).toContain("Second");
    expect(html.indexOf("Second")).toBeGreaterThan(html.indexOf("First"));
    expect(html).not.toContain("totallyUnknown");
  });

  it("renders nothing for an empty or missing layout", () => {
    expect(renderToStaticMarkup(createElement(RenderBlocks, { blocks: [] }))).toBe("");
    expect(renderToStaticMarkup(createElement(RenderBlocks, {}))).toBe("");
  });
});
