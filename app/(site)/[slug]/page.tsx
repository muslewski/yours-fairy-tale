import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";

import { RenderBlocks } from "@/components/blocks/render-blocks";
import { getPageBySlug, getPublishedPageSlugs } from "@/lib/pages-source";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getPublishedPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { isEnabled: draft } = await draftMode();
  const page = await getPageBySlug(slug, { draft });
  if (!page) return {};

  const meta = page.meta;
  const title = meta?.title ?? page.title;
  const description = meta?.description ?? undefined;
  const ogUrl =
    meta?.image && typeof meta.image === "object" ? (meta.image.url ?? undefined) : undefined;

  return {
    title,
    description,
    alternates: { canonical: "/" + slug },
    openGraph: {
      title,
      description,
      url: "/" + slug,
      ...(ogUrl ? { images: [{ url: ogUrl }] } : {}),
    },
  };
}

export default async function CmsPage({ params }: Params) {
  const { slug } = await params;
  const { isEnabled: draft } = await draftMode();
  const page = await getPageBySlug(slug, { draft });
  if (!page) notFound();

  return <RenderBlocks blocks={page.layout} />;
}
