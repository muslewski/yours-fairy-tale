import { unstable_cache } from "next/cache";

import { getPayloadClient } from "@/lib/payload";
import type { PageDoc } from "@/lib/pages-types";

/**
 * Server-only resolver for CMS pages.
 *
 * Reads the Payload `pages` collection via the Local API. Published reads are
 * cached (`unstable_cache`, tagged `pages` / `page:<slug>`); the collection's
 * afterChange hook busts those tags so a publish shows up without a deploy.
 * Draft reads bypass the cache (preview is request-time). Every read falls back
 * gracefully (null / []) on a DB error, mirroring getPricing() — a DB hiccup
 * never 500s the route.
 *
 * Server-only by construction (imports getPayloadClient → payload); never import
 * from a "use client" module.
 */

// Loose view of the Local API find — the generated collection-slug union only
// exists after a build/generate writes payload-types.ts, so cast defensively
// here (same posture as lib/pricing-source.ts).
type FindArgs = {
  collection: string;
  draft?: boolean;
  depth?: number;
  limit?: number;
  pagination?: boolean;
  overrideAccess?: boolean;
  where?: unknown;
  select?: unknown;
};
type FindResult = { docs: unknown[] };

export async function readPage(slug: string, draft: boolean): Promise<PageDoc | null> {
  try {
    const payload = await getPayloadClient();
    const find = payload.find as unknown as (args: FindArgs) => Promise<FindResult>;
    const res = await find({
      collection: "pages",
      draft,
      depth: 2, // populate the media-block upload + meta.image to their .url
      limit: 1,
      overrideAccess: draft, // drafts need the override; public reads stay gated
      where: draft
        ? { slug: { equals: slug } }
        : { and: [{ slug: { equals: slug } }, { _status: { equals: "published" } }] },
    });
    return (res.docs[0] as PageDoc) ?? null;
  } catch {
    return null;
  }
}

/** Cached published read; draft reads bypass the cache. */
export async function getPageBySlug(
  slug: string,
  opts?: { draft?: boolean },
): Promise<PageDoc | null> {
  if (opts?.draft) return readPage(slug, true);
  const cached = unstable_cache(() => readPage(slug, false), ["page", slug], {
    tags: ["pages", "page:" + slug],
    revalidate: 300,
  });
  return cached();
}

export async function readPublishedSlugs(): Promise<string[]> {
  try {
    const payload = await getPayloadClient();
    const find = payload.find as unknown as (args: FindArgs) => Promise<FindResult>;
    const res = await find({
      collection: "pages",
      where: { _status: { equals: "published" } },
      limit: 1000,
      pagination: false,
      select: { slug: true },
    });
    return res.docs
      .map((d) => (d as { slug?: string }).slug)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}

/** Cached list of published slugs; tagged `pages-sitemap` so a publish busts it. */
export const getPublishedPageSlugs = unstable_cache(readPublishedSlugs, ["pages-slugs"], {
  tags: ["pages", "pages-sitemap"],
  revalidate: 300,
});
