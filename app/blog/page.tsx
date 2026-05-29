import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, categoryMeta, formatDate } from "@/lib/blog";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import { PostCard } from "@/components/blog/post-card";

export const metadata: Metadata = {
  title: "The Journal — Yours Fairy Tale",
  description:
    "Gentle notes on books, bedtime, and the small things worth keeping, from the studio behind your child's storybook.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  const [featured, ...rest] = posts;
  const featuredCat = categoryMeta(featured.category);

  return (
    <div className="mx-auto max-w-7xl px-6 sm:px-10">
      <header className="max-w-2xl">
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-comic-sm">
          The Journal
        </span>
        <AnimatedHeading
          as="h1"
          text="Notes from the studio"
          className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
        />
        <p className="mt-4 text-lg font-medium text-brand-deep/75">
          Gentle thoughts on books, bedtime, and the small things worth keeping.
        </p>
      </header>

      {/* Featured (latest) */}
      <Link
        href={`/blog/${featured.slug}`}
        className="group mt-12 grid overflow-hidden rounded-[28px] border-[3px] border-brand-deep bg-white shadow-comic transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-comic-lg md:grid-cols-[1.1fr_1fr]"
      >
        <div
          className={`flex items-center justify-center ${featuredCat.bg} p-10 text-7xl sm:text-8xl`}
          aria-hidden
        >
          {featuredCat.emoji}
        </div>
        <div className="flex flex-col justify-center border-t-[3px] border-brand-deep p-7 sm:p-9 md:border-l-[3px] md:border-t-0">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border-[2px] border-brand-deep px-2.5 py-0.5 text-xs font-black uppercase tracking-wide">
            Latest · {featured.category}
          </span>
          <h2 className="mt-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold leading-tight text-brand-deep sm:text-3xl">
            {featured.title}
          </h2>
          <p className="mt-3 text-base font-medium text-brand-deep/70">{featured.excerpt}</p>
          <div className="mt-5 text-xs font-bold text-brand-deep/55">
            {formatDate(featured.date)} · {featured.readingTime} min read
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-wide text-brand-pink">
            Read story
            <span aria-hidden className="transition-transform duration-150 group-hover:translate-x-1">
              →
            </span>
          </span>
        </div>
      </Link>

      {/* The rest */}
      {rest.length > 0 && (
        <>
          <h2 className="mt-16 font-[family-name:var(--font-fredoka)] text-2xl font-bold uppercase tracking-tight text-brand-deep">
            More stories
          </h2>
          <ul className="mt-7 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <li key={post.slug}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-14 text-sm font-semibold text-brand-deep/50">
        Prefer a feed? Subscribe via{" "}
        <a href="/blog/rss.xml" className="text-brand-pink underline decoration-2 underline-offset-2">
          RSS
        </a>
        .
      </p>
    </div>
  );
}
