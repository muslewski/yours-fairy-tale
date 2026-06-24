/**
 * Slugs a CMS Page may NOT claim — they map to real static routes (or the
 * homepage), and a Page must never shadow them. Used by the Pages `slug`
 * validate and by generateStaticParams.
 */
const CONCEPT_SLUGS = [
  "1-magic-sparkle",
  "2-bento-grid",
  "3-glass-dream",
  "4-storybook-editorial",
  "5-aurora-mesh",
  "6-pop-comic",
  "7-cloud-castle",
  "8-neumorph-pastel",
  "9-sticker-sheet",
  "10-floating-3d",
];

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "",
  "home",
  "blog",
  "contact",
  "series",
  "studio",
  "app",
  "admin",
  "api",
  "sign-in",
  "open",
  "order-confirmed",
  "legacy-examples",
  "privacy",
  "terms",
  "refund",
  ...CONCEPT_SLUGS,
]);

/** Lowercase, strip accents, collapse non-alphanumerics to single hyphens. */
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(normalizeSlug(slug));
}
