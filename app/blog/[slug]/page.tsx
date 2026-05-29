import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllSlugs,
  getPostBySlug,
  getRelatedPosts,
  categoryMeta,
  formatDate,
} from "@/lib/blog";
import { Prose } from "@/components/blog/prose";
import { PostCard } from "@/components/blog/post-card";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not found — The Journal" };
  return {
    title: `${post.title} — The Journal`,
    description: post.excerpt,
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const cat = categoryMeta(post.category);
  const related = getRelatedPosts(slug, 3);

  return (
    <article className="mx-auto max-w-3xl px-6 sm:px-10">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-brand-deep/60 transition-colors hover:text-brand-pink"
      >
        <span aria-hidden>←</span> The Journal
      </Link>

      <header className="mt-8">
        <span className="inline-flex items-center gap-2 rounded-full border-[3px] border-brand-deep bg-white px-3 py-1 text-xs font-black uppercase tracking-wide shadow-comic-sm">
          <span
            aria-hidden
            className={`flex h-6 w-6 items-center justify-center rounded-md ${cat.bg} text-sm`}
          >
            {cat.emoji}
          </span>
          {post.category}
        </span>
        <h1 className="mt-5 font-[family-name:var(--font-fredoka)] text-4xl font-bold leading-[1.05] tracking-tight text-brand-deep sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-5 text-sm font-bold text-brand-deep/55">
          By {post.author} · {formatDate(post.date)} · {post.readingTime} min read
        </p>
      </header>

      <hr className="my-8 border-t-[3px] border-dashed border-brand-deep/15" />

      <Prose content={post.content} />

      {/* End CTA */}
      <div className="mt-14 rounded-3xl border-[3px] border-brand-deep bg-brand-yellow p-8 text-center shadow-comic">
        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold text-brand-deep">
          Want a book like this for your child?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-base font-medium text-brand-deep/75">
          Add their name, choose an adventure, and we&apos;ll hand-illustrate the rest.
        </p>
        <Link
          href="/#build"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
        >
          Create your book →
        </Link>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold uppercase tracking-tight text-brand-deep">
            More stories
          </h2>
          <ul className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((p) => (
              <li key={p.slug}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
