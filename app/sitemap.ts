import type { MetadataRoute } from "next";

import { getPublishedPageSlugs } from "@/lib/pages-source";

const SITE = "https://www.yoursfairytale.com";

type Route = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

/**
 * Sitemap of the public, indexable routes. The signed-in customer area, admin,
 * and auth pages are intentionally excluded (see robots.ts). Published CMS
 * pages are appended from Payload (tagged read, so a publish busts the cache).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const routes: Route[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/series", priority: 0.8, changeFrequency: "weekly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/contact", priority: 0.5, changeFrequency: "monthly" },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
    { path: "/refund", priority: 0.3, changeFrequency: "yearly" },
  ];

  const pageRoutes: Route[] = (await getPublishedPageSlugs()).map((slug) => ({
    path: "/" + slug,
    priority: 0.6,
    changeFrequency: "weekly",
  }));

  return [...routes, ...pageRoutes].map(({ path, priority, changeFrequency }) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
