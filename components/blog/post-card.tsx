import Link from "next/link";
import { categoryMeta, formatDate, type PostMeta } from "@/lib/blog";

/**
 * Post card for the blog grid. `group` lives on the stable <article> so the
 * inner lift can't trigger the edge-jitter loop (see CLAUDE.md).
 */
export function PostCard({ post }: { post: PostMeta }) {
  const cat = categoryMeta(post.category);
  return (
    <article className="group h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="flex h-full flex-col rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic transition-[transform,box-shadow] duration-150 group-hover:-translate-y-1 group-hover:shadow-comic-lg"
      >
        <span
          aria-hidden
          className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-brand-deep ${cat.bg} text-2xl shadow-comic-sm`}
        >
          {cat.emoji}
        </span>
        <span className="mt-5 inline-flex w-fit items-center rounded-full border-[2px] border-brand-deep px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-brand-deep">
          {post.category}
        </span>
        <h3 className="mt-3 font-[family-name:var(--font-fredoka)] text-xl font-bold leading-tight text-brand-deep">
          {post.title}
        </h3>
        <p className="mt-2 text-sm font-medium text-brand-deep/70">{post.excerpt}</p>
        <div className="mt-auto pt-5 text-xs font-bold text-brand-deep/55">
          {formatDate(post.date)} · {post.readingTime} min read
        </div>
      </Link>
    </article>
  );
}
