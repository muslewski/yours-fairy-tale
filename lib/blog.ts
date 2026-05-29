import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export type PostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO (YYYY-MM-DD)
  category: string;
  author: string;
  readingTime: number; // minutes
};

export type Post = PostMeta & { content: string };

/** Brand-palette + emoji per category, used for card and article accents. */
export const CATEGORY_META: Record<string, { bg: string; emoji: string }> = {
  "Reading together": { bg: "bg-brand-blue", emoji: "📖" },
  "Behind the scenes": { bg: "bg-brand-pink", emoji: "🎨" },
  Keepsakes: { bg: "bg-brand-yellow", emoji: "🧸" },
  Gifting: { bg: "bg-brand-blue", emoji: "🎁" },
  "For parents": { bg: "bg-brand-yellow", emoji: "🌙" },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? { bg: "bg-brand-yellow", emoji: "✶" };
}

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function parseFile(slug: string): Post {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: String(data.title ?? ""),
    excerpt: String(data.excerpt ?? ""),
    date: String(data.date ?? ""),
    category: String(data.category ?? ""),
    author: String(data.author ?? ""),
    readingTime: estimateReadingTime(content),
    content,
  };
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

export function getAllPosts(): PostMeta[] {
  return getAllSlugs()
    .map((slug) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...meta } = parseFile(slug);
      return meta;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): Post | null {
  try {
    return parseFile(slug);
  } catch {
    return null;
  }
}

/** Other recent posts, excluding the given slug. */
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  return getAllPosts()
    .filter((p) => p.slug !== slug)
    .slice(0, limit);
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
