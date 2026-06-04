import type { Metadata } from "next";
import Link from "next/link";

import { ContactForm } from "@/components/contact/contact-form";

export const metadata: Metadata = {
  title: "Contact — Yours Fairy Tale",
  description:
    "Questions about an order, a change, or a gift? Reach a real person at Yours Fairy Tale. We read every message and reply, usually within one business day.",
};

const HIGHLIGHTS = [
  { title: "Order help", body: "Questions before or after you order — we'll walk you through it." },
  { title: "Changes & revisions", body: "Need to tweak a name, a photo, or a scene? Just ask." },
  { title: "Delivery & formats", body: "When it's ready, how you'll watch it, and where to find it." },
  { title: "Gifting", body: "Ordering for someone else? We'll help you make it feel special." },
];

const FAQS = [
  {
    q: "How soon will I hear back?",
    a: "We read every message ourselves and reply within one business day, often sooner.",
  },
  {
    q: "Can I change my order after placing it?",
    a: "Yes. Tell us what you'd like to change and we'll update it before your video goes into animation.",
  },
  {
    q: "How do refunds work?",
    a: "If something isn't right, write to us — we'll make it right or arrange a refund.",
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 sm:px-10">
      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl">
        <p className="text-sm font-black uppercase tracking-widest text-brand-pink">
          We're here to help
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-fredoka)] text-4xl font-bold leading-[1.0] sm:text-5xl">
          Talk to a real person
        </h1>
        <p className="mt-4 text-lg font-medium text-brand-deep/75">
          Questions about an order, a change you'd like, or a gift you're planning — write to us.
          We read every message ourselves and reply, usually within one business day.
        </p>
      </section>

      {/* ── Split card: form + direct channels ────────────────────────────── */}
      <section className="mt-12">
        <div className="grid overflow-hidden rounded-[28px] border-[3px] border-brand-deep shadow-comic-lg lg:grid-cols-[1.4fr_1fr]">
          <div className="bg-brand-cream p-8 sm:p-10">
            <h2 className="text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Send us a message
            </h2>
            <p className="mb-7 mt-2 text-brand-deep/70">
              Tell us what's on your mind and we'll get right back to you.
            </p>
            <ContactForm />
          </div>

          <div
            className="relative flex flex-col justify-between gap-8 bg-brand-deep p-8 text-white sm:p-10 lg:border-l-[3px] lg:border-brand-deep"
            style={{
              backgroundImage:
                "radial-gradient(circle at 10px 10px, rgba(255,249,238,0.10) 2px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          >
            <div className="relative z-10">
              <h2 className="text-xl" style={{ fontFamily: "var(--font-fredoka)" }}>
                Prefer email?
              </h2>
              <a
                href="mailto:hello@yoursfairytale.com"
                className="mt-3 inline-block text-lg font-bold text-brand-yellow underline-offset-4 hover:underline"
              >
                hello@yoursfairytale.com
              </a>
              <p className="mt-3 text-sm text-white/70">
                We reply within one business day.
              </p>
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                Find us
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["Instagram", "TikTok", "Pinterest"].map((s) => (
                  <span
                    key={s}
                    className="rounded-lg border-2 border-white/30 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/70"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Support highlights ────────────────────────────────────────────── */}
      <section className="mt-20">
        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold sm:text-3xl">
          What we can help with
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-5 shadow-comic-sm"
            >
              <h3 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                {h.title}
              </h3>
              <p className="mt-2 text-sm text-brand-deep/70">{h.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mini-FAQ ──────────────────────────────────────────────────────── */}
      <section className="mt-20">
        <h2 className="font-[family-name:var(--font-fredoka)] text-2xl font-bold sm:text-3xl">
          Quick answers
        </h2>
        <dl className="mt-6 space-y-4">
          {FAQS.map((f) => (
            <div
              key={f.q}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic-sm"
            >
              <dt className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
                {f.q}
              </dt>
              <dd className="mt-2 text-brand-deep/70">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-brand-deep/70">
          Looking for more?{" "}
          <Link href="/#faq" className="font-bold text-brand-deep underline underline-offset-4">
            Read the full FAQ
          </Link>
          .
        </p>
      </section>

      {/* ── Place-an-order CTA band ───────────────────────────────────────── */}
      <section className="mt-20">
        <div className="rounded-[28px] border-[3px] border-brand-deep bg-brand-yellow p-8 shadow-comic-lg sm:p-12">
          <h2 className="max-w-2xl font-[family-name:var(--font-fredoka)] text-3xl font-bold leading-[1.0] sm:text-4xl">
            Ready to make their story?
          </h2>
          <p className="mt-4 max-w-xl text-base font-medium text-brand-deep/75">
            Pick a world, add a few details, and picture their video. No payment until you're ready.
          </p>
          <Link
            href="/#build"
            className="mt-7 inline-flex items-center gap-1 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Place an order →
          </Link>
        </div>
      </section>
    </div>
  );
}
