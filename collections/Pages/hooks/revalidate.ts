import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload";

async function bust(slug: string) {
  // Dynamic import keeps next/cache out of the Payload CLI graph (migrate /
  // generate:types load this config outside a request). Mirrors globals/Pricing.
  const { revalidatePath, revalidateTag } = await import("next/cache");
  revalidatePath("/" + slug);
  revalidateTag("page:" + slug, "max");
  revalidateTag("pages-sitemap", "max");
}

export const revalidatePage: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  context,
}) => {
  if (context?.disableRevalidate) return doc;
  if (doc?.slug) await bust(doc.slug);
  // Slug renamed → also clear the old path/tag.
  if (previousDoc?.slug && previousDoc.slug !== doc?.slug) {
    await bust(previousDoc.slug);
  }
  return doc;
};

export const revalidatePageDelete: CollectionAfterDeleteHook = async ({
  doc,
  context,
}) => {
  if (context?.disableRevalidate) return doc;
  if (doc?.slug) await bust(doc.slug);
  return doc;
};
