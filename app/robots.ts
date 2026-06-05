import type { MetadataRoute } from "next";

const SITE = "https://www.yoursfairytale.com";

/**
 * robots.txt — allow crawling of the public marketing site, keep the signed-in
 * customer area, admin, auth, and API out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app", "/admin", "/api", "/sign-in"],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
