import Link from "next/link";

export interface LegalSection {
  heading: string;
  /** Paragraphs of prose. */
  body?: string[];
  /** Optional bullet list rendered after the paragraphs. */
  bullets?: string[];
}

/**
 * Shared presentation for the legal/trust pages (privacy, terms, refund). Each
 * page supplies its title, last-updated date, intro, and a list of sections; the
 * layout keeps them visually consistent and readable. Copy lives in the pages.
 */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  sections,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 sm:px-10">
      <header className="max-w-2xl">
        <p className="text-sm font-black uppercase tracking-widest text-brand-pink">
          Legal
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-4xl font-bold leading-[1.0] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-brand-deep/45">
          Last updated {lastUpdated}
        </p>
        <p className="mt-5 text-lg font-medium text-brand-deep/75">{intro}</p>
      </header>

      <div className="mt-12 space-y-10">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2
              className="text-2xl font-bold text-brand-deep"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              {section.heading}
            </h2>
            {section.body?.map((paragraph, i) => (
              <p key={i} className="mt-3 leading-relaxed text-brand-deep/80">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="mt-3 list-disc space-y-2 pl-6 text-brand-deep/80 marker:text-brand-pink">
                {section.bullets.map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic-sm">
        <p className="text-brand-deep/80">
          Questions about this policy? Write to us at{" "}
          <a
            href="mailto:hello@yoursfairytale.com"
            className="font-bold text-brand-deep underline underline-offset-4"
          >
            hello@yoursfairytale.com
          </a>{" "}
          or through our{" "}
          <Link
            href="/contact"
            className="font-bold text-brand-deep underline underline-offset-4"
          >
            contact page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
