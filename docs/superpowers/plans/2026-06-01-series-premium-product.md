# The Series — Premium Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second, coming-soon premium product — "The Series" (a personalized ~20-episode animated series delivered via a dedicated iOS/Android app) — as a distinct homepage teaser band plus a detailed `/series` subpage with a front-end-only waitlist form.

**Architecture:** Pure front-end on the existing Next.js 16 App Router site. A shared decorative `PhoneMockup` is used by both the homepage teaser and the subpage hero. The subpage follows the established blog pattern: a route directory with its own `layout.tsx` (reusing `SiteNav` + `SiteFooter`) and a `page.tsx` composing focused section components under `components/series/`. The waitlist is a `"use client"` mock with a local success state — no backend.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@theme` tokens in `app/globals.css`), Motion (`motion/react`). No test runner exists (`package.json` has only `dev`/`build`/`start`), so verification is `npx tsc --noEmit`, `npm run build`, and manual checks — not a unit-test harness.

**Conventions (from CLAUDE.md):** brand colors only via Tailwind `bg-brand-*`/`text-brand-*` or `var(--color-brand-*)` (never new hardcoded hex; for translucent fills use `color-mix(in srgb, var(--color-brand-*) N%, transparent)`); `shadow-comic*` tokens; Motion guarded with `useReducedMotion()` (CSS `animate-*` utilities are already globally disabled under `prefers-reduced-motion`); every CTA/link resolves to a real anchor or route (no `href="#"`). Copy is calm, warm, keepsake, American English, sentence case, no comic SFX, no em-dashes. Decorative emoji on visual icons are fine (the categories grid already does this); emoji never appear in prose.

**Out of scope:** any real backend/email storage/payments/app; the video product; blog/legacy/concept pages; design-system changes.

---

## File map

- **Create** `components/series/phone-mockup.tsx` — shared decorative phone/app visual (server component). Task 1.
- **Create** `components/series/waitlist-form.tsx` — `"use client"` email capture with success state. Task 2.
- **Create** `components/home/series-teaser.tsx` — homepage premium band (`id="series"`, client). Task 3.
- **Modify** `app/page.tsx` — render `<SeriesTeaser />` after `<Configurator />`. Task 3.
- **Create** `app/series/layout.tsx` — subpage shell (nav + footer). Task 4.
- **Create** `components/series/series-hero.tsx` — subpage hero (server). Task 4.
- **Create** `components/series/series-sections.tsx` — informational sections (server). Task 4.
- **Create** `app/series/page.tsx` — composes hero + sections + waitlist; exports metadata. Task 4.
- **Modify** `components/home/site-nav.tsx` — add "Series" nav link. Task 5.
- **Modify** `components/home/site-footer.tsx` — add "The Series" footer link. Task 5.
- **Verify** — Task 6.

---

## Task 1: Shared phone/app mockup

**Files:**
- Create: `components/series/phone-mockup.tsx`

A purely decorative (`aria-hidden`) stylized phone showing the series. No motion of its own (callers add `animate-float-slow`). Server component.

- [ ] **Step 1: Create the file**

```tsx
type Props = { className?: string };

/**
 * Decorative phone frame showing "the app" — a series episode with a play
 * button and an episode strip. Purely visual (aria-hidden). Callers can add
 * `animate-float-slow` for a gentle drift (CSS, auto-disabled under
 * prefers-reduced-motion).
 */
export function PhoneMockup({ className = "" }: Props) {
  return (
    <div className={`relative mx-auto w-[230px] sm:w-[260px] ${className}`} aria-hidden>
      <div className="relative rounded-[2.5rem] border-[4px] border-brand-deep bg-brand-deep p-2.5 shadow-comic-lg">
        {/* speaker notch */}
        <div className="absolute left-1/2 top-3 z-10 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/40" />
        {/* screen */}
        <div className="overflow-hidden rounded-[2rem] bg-brand-cream">
          {/* hero scene */}
          <div className="relative flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-brand-blue via-brand-pink to-brand-yellow">
            <span className="absolute left-3 top-3 rounded-full border-[2px] border-brand-deep bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-brand-deep">
              S1 · E1
            </span>
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-brand-deep bg-white shadow-comic-sm">
              <span className="ml-1 h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-brand-deep" />
            </span>
          </div>
          {/* episode strip */}
          <div className="space-y-2 p-3">
            <div className="h-2.5 w-2/3 rounded-full bg-brand-deep/15" />
            <div className="h-2.5 w-1/2 rounded-full bg-brand-deep/10" />
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-lg border-[2px] border-brand-deep/15 bg-brand-deep/5"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/series/phone-mockup.tsx
git commit -m "Add shared PhoneMockup visual for The Series"
```

---

## Task 2: Waitlist form

**Files:**
- Create: `components/series/waitlist-form.tsx`

Front-end-only email capture. On submit, swaps to a warm success message. `required` blocks empty browser submits; the `.trim()` guard is belt-and-suspenders. Accessible label + `role="status"` on success.

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p
        role="status"
        className="rounded-2xl border-[3px] border-brand-deep bg-white px-6 py-5 text-base font-bold text-brand-deep shadow-comic"
      >
        You are on the list. We will write the moment it is ready.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <label htmlFor="series-email" className="sr-only">
        Email address
      </label>
      <input
        id="series-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="w-full rounded-xl border-[3px] border-brand-deep bg-white px-5 py-4 text-base font-semibold text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-4 focus:ring-brand-pink/40"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
      >
        Notify me
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/series/waitlist-form.tsx
git commit -m "Add front-end waitlist form for The Series"
```

---

## Task 3: Homepage teaser band + wire into the homepage

**Files:**
- Create: `components/home/series-teaser.tsx`
- Modify: `app/page.tsx`

A premium band placed after the configurator. Distinct deep treatment with token-based gradient glows, a "Premium · coming soon" sticker, ~20 episode dots, platform line, the shared `PhoneMockup`, and CTAs to `/series` and `/series#waitlist`.

- [ ] **Step 1: Create `components/home/series-teaser.tsx`**

```tsx
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import { PhoneMockup } from "@/components/series/phone-mockup";

export function SeriesTeaser() {
  const reduce = useReducedMotion();

  return (
    <section
      id="series"
      className="relative overflow-hidden bg-brand-deep py-20 text-white sm:py-28"
      style={{
        backgroundImage:
          "radial-gradient(circle at 88% 8%, color-mix(in srgb, var(--color-brand-pink) 28%, transparent), transparent 45%), radial-gradient(circle at 5% 92%, color-mix(in srgb, var(--color-brand-blue) 24%, transparent), transparent 45%)",
      }}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 sm:px-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-white bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_var(--color-brand-blue)]">
            Premium · coming soon
          </span>
          <AnimatedHeading
            as="h2"
            text="Give them a whole series, not just one story"
            className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
          <p className="mt-5 max-w-xl text-lg font-medium text-white/70">
            Their very own show: an ongoing animated adventure of around twenty episodes, with your
            child as the hero of every one. Delivered in a dedicated app for iOS and Android.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-1.5" aria-hidden>
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-brand-yellow" : "bg-white/25"}`}
              />
            ))}
            <span className="ml-2 text-xs font-bold uppercase tracking-widest text-white/50">
              ~20 episodes
            </span>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <motion.div
              whileHover={reduce ? undefined : { scale: 1.04 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
            >
              <Link
                href="/series"
                className="inline-flex items-center gap-2 rounded-xl border-[3px] border-white bg-brand-yellow px-7 py-4 text-base font-black uppercase tracking-wide text-brand-deep shadow-comic"
              >
                See what&apos;s coming →
              </Link>
            </motion.div>
            <Link
              href="/series#waitlist"
              className="text-sm font-bold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              or join the waitlist
            </Link>
          </div>

          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/45">
            iOS · Android · final pricing at launch
          </p>
        </div>

        <motion.div
          {...(reduce
            ? {}
            : {
                initial: { opacity: 0, scale: 0.9, y: 24 },
                whileInView: { opacity: 1, scale: 1, y: 0 },
                viewport: { once: true, margin: "-80px" },
                transition: { type: "spring" as const, stiffness: 140, damping: 18 },
              })}
        >
          <PhoneMockup className="animate-float-slow" />
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire it into `app/page.tsx`**

The current file is:

```tsx
import { SiteNav } from "@/components/home/site-nav";
import { Hero } from "@/components/home/hero";
import { Categories } from "@/components/home/categories";
import { Configurator } from "@/components/home/configurator";
import { Faq } from "@/components/home/faq";
import { CtaBanner } from "@/components/home/cta-banner";
import { SiteFooter } from "@/components/home/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        <Hero />
        <Categories />
        <Configurator />
        <Faq />
        <CtaBanner />
      </main>

      <SiteFooter />
    </>
  );
}
```

Add the import (after the `Configurator` import) and render `<SeriesTeaser />` immediately after `<Configurator />`, so the file becomes:

```tsx
import { SiteNav } from "@/components/home/site-nav";
import { Hero } from "@/components/home/hero";
import { Categories } from "@/components/home/categories";
import { Configurator } from "@/components/home/configurator";
import { SeriesTeaser } from "@/components/home/series-teaser";
import { Faq } from "@/components/home/faq";
import { CtaBanner } from "@/components/home/cta-banner";
import { SiteFooter } from "@/components/home/site-footer";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="font-[family-name:var(--font-quicksand)] text-brand-deep">
        <Hero />
        <Categories />
        <Configurator />
        <SeriesTeaser />
        <Faq />
        <CtaBanner />
      </main>

      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/home/series-teaser.tsx app/page.tsx
git commit -m "Add The Series teaser band to the homepage"
```

---

## Task 4: The /series subpage

**Files:**
- Create: `app/series/layout.tsx`
- Create: `components/series/series-hero.tsx`
- Create: `components/series/series-sections.tsx`
- Create: `app/series/page.tsx`

- [ ] **Step 1: Create `app/series/layout.tsx`** (mirrors `app/blog/layout.tsx`)

```tsx
import { SiteNav } from "@/components/home/site-nav";
import { SiteFooter } from "@/components/home/site-footer";

export default function SeriesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-brand-cream pb-24 pt-28 font-[family-name:var(--font-quicksand)] text-brand-deep sm:pt-32">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 2: Create `components/series/series-hero.tsx`**

```tsx
import Link from "next/link";
import { AnimatedHeading } from "@/components/motion/animated-heading";
import { PhoneMockup } from "@/components/series/phone-mockup";

export function SeriesHero() {
  return (
    <header className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
      <div>
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-comic-sm">
          Premium · coming soon
        </span>
        <AnimatedHeading
          as="h1"
          text="Their very own show, made just for them"
          className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl"
        />
        <p className="mt-5 max-w-xl text-lg font-medium text-brand-deep/75">
          A personalized animated series of around twenty episodes, with your child as the hero of an
          ongoing adventure. It lives in a dedicated app for iOS and Android, ready whenever it is
          time to watch.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="#waitlist"
            className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-yellow px-7 py-4 text-base font-black uppercase tracking-wide text-brand-deep shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Join the waitlist →
          </Link>
          <Link
            href="/#build"
            className="inline-flex items-center gap-2 rounded-xl border-[3px] border-brand-deep bg-white px-6 py-4 text-base font-bold text-brand-deep shadow-comic transition-transform duration-150 active:translate-y-1 active:shadow-comic-sm"
          >
            Start with one video
          </Link>
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-widest text-brand-deep/45">
          iOS · Android · final pricing at launch
        </p>
      </div>
      <PhoneMockup className="animate-float-slow" />
    </header>
  );
}
```

- [ ] **Step 3: Create `components/series/series-sections.tsx`**

```tsx
import { AnimatedHeading } from "@/components/motion/animated-heading";

const APP_FEATURES = [
  { icon: "📱", title: "iOS and Android", line: "A dedicated app for the devices you already watch on." },
  { icon: "✨", title: "New episodes arrive", line: "Each new chapter appears in the app as it is finished." },
  { icon: "🛬", title: "Watch offline", line: "Download episodes for the car, the plane, or quiet time." },
  { icon: "🧸", title: "Kid-safe and ad-free", line: "A calm, gentle space made only for their story." },
];

const WAYS = [
  {
    tag: "Membership",
    title: "New episodes over time",
    line: "Join and watch the story unfold, with fresh episodes added on a regular rhythm.",
    bg: "bg-brand-blue",
    text: "text-brand-deep",
  },
  {
    tag: "One-time",
    title: "Own the whole series",
    line: "Prefer it all at once? Buy the complete series and keep every episode for good.",
    bg: "bg-brand-pink",
    text: "text-white",
  },
];

const STEPS = [
  { n: "1", title: "Tell us about your child", line: "Their name, their look, the things they love. The same details that shape a single video." },
  { n: "2", title: "We produce their series", line: "Our artists animate an ongoing adventure, one episode at a time." },
  { n: "3", title: "Watch in the app", line: "Open the app together and watch new episodes as they arrive." },
];

export function SeriesSections() {
  return (
    <div className="mt-20 space-y-24 sm:mt-28 sm:space-y-32">
      {/* What it is */}
      <section>
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
          What it is
        </span>
        <AnimatedHeading
          as="h2"
          text="An ongoing adventure, with one familiar hero"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <p className="mt-5 max-w-2xl text-lg font-medium text-brand-deep/75">
          A single video is a lovely first story. The series is the whole journey: around twenty
          episodes where your child returns again and again, growing braver and kinder with each one.
          It is the show they will ask for at the end of every day.
        </p>
      </section>

      {/* A dedicated app */}
      <section>
        <span className="inline-block rotate-[2deg] rounded-lg border-[3px] border-brand-deep bg-brand-blue px-3 py-1.5 text-xs font-black uppercase tracking-widest text-brand-deep shadow-comic-sm">
          A dedicated app
        </span>
        <AnimatedHeading
          as="h2"
          text="Their story, ready whenever they are"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {APP_FEATURES.map((f) => (
            <li
              key={f.title}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-6 shadow-comic"
            >
              <span
                aria-hidden
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border-[3px] border-brand-deep bg-brand-cream text-2xl shadow-comic-sm"
              >
                {f.icon}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                {f.title}
              </h3>
              <p className="mt-2 text-base font-medium text-brand-deep/70">{f.line}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Two ways to watch */}
      <section>
        <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-comic-sm">
          Two ways to watch
        </span>
        <AnimatedHeading
          as="h2"
          text="Choose the way that suits your family"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {WAYS.map((w) => (
            <div
              key={w.tag}
              className="rounded-[24px] border-[3px] border-brand-deep bg-white p-8 shadow-comic"
            >
              <span
                className={`inline-block rounded-full border-[3px] border-brand-deep ${w.bg} ${w.text} px-3 py-1 text-xs font-black uppercase tracking-widest shadow-comic-sm`}
              >
                {w.tag}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-2xl font-bold">
                {w.title}
              </h3>
              <p className="mt-3 text-base font-medium text-brand-deep/70">{w.line}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm font-bold text-brand-deep/55">
          Final pricing for both will be shared at launch.
        </p>
      </section>

      {/* How it works */}
      <section>
        <span className="inline-block rotate-[2deg] rounded-lg border-[3px] border-brand-deep bg-brand-yellow px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
          How it works
        </span>
        <AnimatedHeading
          as="h2"
          text="From their name to their own show"
          className="mt-6 max-w-3xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl"
        />
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border-[3px] border-brand-deep bg-white p-7 shadow-comic"
            >
              <span
                aria-hidden
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-brand-deep bg-brand-blue font-[family-name:var(--font-fredoka)] text-xl font-bold text-brand-deep shadow-comic-sm"
              >
                {s.n}
              </span>
              <h3 className="mt-5 font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                {s.title}
              </h3>
              <p className="mt-2 text-base font-medium text-brand-deep/70">{s.line}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/series/page.tsx`**

```tsx
import type { Metadata } from "next";
import { SeriesHero } from "@/components/series/series-hero";
import { SeriesSections } from "@/components/series/series-sections";
import { WaitlistForm } from "@/components/series/waitlist-form";

export const metadata: Metadata = {
  title: "The Series — Yours Fairy Tale",
  description:
    "A personalized animated series starring your child, delivered in a dedicated app for iOS and Android. Coming soon — join the waitlist.",
};

export default function SeriesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 sm:px-10">
      <SeriesHero />
      <SeriesSections />

      {/* Waitlist */}
      <section id="waitlist" className="mt-24 sm:mt-32">
        <div className="rounded-[28px] border-[3px] border-brand-deep bg-brand-yellow p-8 shadow-comic-lg sm:p-12">
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-brand-deep bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest shadow-comic-sm">
            Coming soon
          </span>
          <h2 className="mt-6 max-w-2xl font-[family-name:var(--font-fredoka)] text-3xl font-bold uppercase leading-[0.98] tracking-tight sm:text-4xl">
            Be the first to know when the series opens
          </h2>
          <p className="mt-4 max-w-xl text-base font-medium text-brand-deep/75">
            Leave your email and we will let you know the moment your child can star in their own
            show. No spam, just one gentle note at launch.
          </p>
          <div className="mt-7 max-w-xl">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/series/layout.tsx app/series/page.tsx components/series/series-hero.tsx components/series/series-sections.tsx
git commit -m "Add The Series subpage: hero, sections, waitlist"
```

---

## Task 5: Nav + footer wiring

**Files:**
- Modify: `components/home/site-nav.tsx`
- Modify: `components/home/site-footer.tsx`

- [ ] **Step 1: Add the nav link** — In `components/home/site-nav.tsx`, the `NAV` array is:

```tsx
const NAV = [
  { label: "Home", href: "/#top" },
  { label: "Matieniatus", href: "/#top" },
  { label: "Fairy Tale", href: "/#collections" },
  { label: "Journal", href: "/blog" },
  { label: "Contact", href: "/#top" },
];
```

Replace it with (adds a "Series" entry after "Fairy Tale"):

```tsx
const NAV = [
  { label: "Home", href: "/#top" },
  { label: "Matieniatus", href: "/#top" },
  { label: "Fairy Tale", href: "/#collections" },
  { label: "Series", href: "/series" },
  { label: "Journal", href: "/blog" },
  { label: "Contact", href: "/#top" },
];
```

- [ ] **Step 2: Add the footer link** — In `components/home/site-footer.tsx`, the "Explore" column is:

```tsx
  {
    title: "Explore",
    links: [
      { label: "Collections", href: "/#collections" },
      { label: "How it works", href: "/#build" },
      { label: "The Journal", href: "/blog" },
      { label: "Pricing", href: "/#build" },
    ],
  },
```

Replace it with (adds "The Series" after "How it works"):

```tsx
  {
    title: "Explore",
    links: [
      { label: "Collections", href: "/#collections" },
      { label: "How it works", href: "/#build" },
      { label: "The Series", href: "/series" },
      { label: "The Journal", href: "/blog" },
      { label: "Pricing", href: "/#build" },
    ],
  },
```

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/home/site-nav.tsx components/home/site-footer.tsx
git commit -m "Link The Series from nav and footer"
```

---

## Task 6: Verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: build succeeds, and the route list includes `○ /series` (prerendered static).

- [ ] **Step 2: Brand-voice / dead-link grep**

Run:
```bash
grep -rniE "pow!|kapow|boom!|magical journey|unleash|game-chang|—" components/series components/home/series-teaser.tsx app/series
```
Expected: no matches (no comic SFX, hype clichés, or em-dashes in the new copy). The `·` middots used in labels are fine; only flag em-dashes (`—`).

- [ ] **Step 3: Manual walkthrough**

Run `npm run dev`:
- Homepage: scroll past the configurator; the "Premium · coming soon" band renders, the phone drifts (CSS float), episode dots show, and "See what's coming" links to `/series`.
- Nav "Series" and footer "The Series" both navigate to `/series`.
- `/series`: hero, "what it is", app feature grid, two-ways cards (no prices, "final pricing at launch" line), how-it-works steps, and the waitlist card all render.
- Waitlist: submitting an empty field does nothing (browser `required`); entering an email and submitting swaps to the "You are on the list…" confirmation.
- The hero "Join the waitlist →" and teaser "/series#waitlist" both land on the waitlist card (below the fixed nav, via global `scroll-padding-top`).
- Toggle OS reduce-motion: the phone stops drifting and entrance animations are disabled; layout intact.

---

## Self-review notes

- **Spec coverage:** PhoneMockup (Task 1) → shared visual; WaitlistForm (Task 2) → main CTA, front-end only, success state, empty guard; SeriesTeaser + homepage wiring (Task 3) → premium band after `#build`, `id="series"`, episode dots, platform line, CTAs; subpage layout/hero/sections/page (Task 4) → all six sections incl. two-ways with no prices and "final pricing at launch", waitlist `id="waitlist"`, metadata; nav + footer (Task 5). Verification (Task 6).
- **Type consistency:** `PhoneMockup` takes `{ className?: string }` and is imported by both the teaser (Task 3) and the hero (Task 4). `WaitlistForm` takes no props, imported by `app/series/page.tsx`. `SeriesTeaser` is a named export imported in `app/page.tsx`. Section component data arrays (`APP_FEATURES`, `WAYS`, `STEPS`) are local to `series-sections.tsx`.
- **Convention checks:** all colors are brand utilities or `var(--color-brand-*)`/`color-mix(... var(--color-brand-*) ...)`; the only arbitrary shadow uses a token var (`shadow-[3px_3px_0_var(--color-brand-blue)]`); no `href="#"`; Motion guarded by `useReducedMotion()` and CSS `animate-float-slow` is globally reduced-motion-safe; emoji appear only as `aria-hidden` decorative icons, never in prose.
- **Server/client split:** `phone-mockup`, `series-hero`, `series-sections`, both layouts, and `app/series/page.tsx` are server components; only `waitlist-form` and `series-teaser` are `"use client"` (they need state / Motion hooks).
```
