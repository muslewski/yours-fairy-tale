import { renderPostOg, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";

export const alt = "Yours Fairy Tale — The Journal";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return renderPostOg(post?.title ?? "The Journal", post?.category);
}
