import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

/** Brand-styled markdown renderer for blog posts (pop-comic, calm reading). */
const components: Components = {
  h2: ({ children }) => (
    <h2 className="mt-10 mb-3 font-[family-name:var(--font-fredoka)] text-2xl font-bold text-brand-deep sm:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 mb-2 font-[family-name:var(--font-fredoka)] text-xl font-semibold text-brand-deep">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-4 text-lg leading-relaxed text-brand-deep/80">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="font-semibold text-brand-pink underline decoration-2 underline-offset-2 transition-colors hover:text-brand-deep"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-5 list-disc space-y-2 pl-6 marker:text-brand-pink">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-5 list-decimal space-y-2 pl-6 marker:font-bold marker:text-brand-pink">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-1 text-lg leading-relaxed text-brand-deep/80">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-2xl border-[3px] border-brand-deep bg-brand-yellow p-5 text-lg font-semibold text-brand-deep shadow-comic-sm">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-bold text-brand-deep">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  hr: () => <hr className="my-8 border-t-[3px] border-dashed border-brand-deep/15" />,
  code: ({ children }) => (
    <code className="rounded bg-brand-deep/10 px-1.5 py-0.5 text-base text-brand-deep">
      {children}
    </code>
  ),
};

export function Prose({ content }: { content: string }) {
  return (
    <div className="font-[family-name:var(--font-quicksand)]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
