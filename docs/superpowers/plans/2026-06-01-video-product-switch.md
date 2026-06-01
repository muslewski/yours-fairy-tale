# Video Product Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch the live homepage product from a hand-illustrated hardcover storybook to a personalized **animated video**, including the configurator's pricing model and all homepage copy.

**Architecture:** Pure front-end change on the Next.js App Router homepage. The configurator (`components/home/configurator.tsx`) is rebuilt around a length tier + extra-minutes slider + detail-level multiplier + video add-ons; every other home section gets a copy rewrite in brand voice. The `Checkout` component and design system are untouched.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4 (`@theme`), Motion (`motion/react`). No test runner exists in this repo (`package.json` has only `dev`/`build`/`start`), so verification is `npx tsc --noEmit`, `next build`, manual browser checks on the dev server, and grep sweeps — not a unit-test harness.

**Brand voice (applies to every copy string below):** calm, warm, sincere, keepsake-focused, American English, sentence case, no comic SFX, no em-dashes, rare exclamation points, no emoji in prose (decorative emoji on visual stickers are fine). Copy in this plan is already written to that standard; use it verbatim.

**Out of scope:** `app/blog/**`, `/legacy-examples`, the 10 archived concept pages, `globals.css`, fonts, palette, and the `Checkout` internals.

---

## File map

- **Modify** `components/home/configurator.tsx` — full rebuild (data model, pricing math, new `RangeSlider`, refactored `Segmented`, copy). Task 1.
- **Modify** `components/home/hero.tsx` — copy + decorative sticker text. Task 2.
- **Modify** `components/home/categories.tsx` — copy + fix dead `href="#"`. Task 3.
- **Modify** `components/home/faq.tsx` — replace `FAQS` array. Task 4.
- **Modify** `components/home/cta-banner.tsx` — copy. Task 5.
- **Modify** `components/home/site-footer.tsx` — copy. Task 6.
- **Modify** `app/layout.tsx` — page metadata. Task 7.
- **Verify** whole tree — Task 8.

---

## Task 1: Rebuild the configurator

**Files:**
- Modify (full replace): `components/home/configurator.tsx`

This is the only logic change. Replace the entire file contents with the version below. Key points: length tier sets base price + base minutes; a `RangeSlider` adds extra minutes at $100 each; detail level multiplies the full subtotal; add-ons are flat and added before the multiplier; summary line items sum exactly to the displayed total; the `CheckoutCart` mirrors those line items.

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { Checkout, type CheckoutCart } from "@/components/checkout";
import { AnimatedHeading } from "@/components/motion/animated-heading";

type SegOption = { id: string; label: string; caption: string; note: string };
type LengthTier = { id: string; label: string; minutes: number; price: number; note: string };
type DetailLevel = { id: string; label: string; multiplier: number; note: string };
type AddOn = { id: string; label: string; price: number; note: string };

const LENGTHS: LengthTier[] = [
  { id: "short", label: "Short", minutes: 3, price: 300, note: "A short and sweet first story." },
  { id: "medium", label: "Medium", minutes: 5, price: 450, note: "Room for a fuller adventure." },
  { id: "long", label: "Long", minutes: 10, price: 900, note: "The full journey, start to finish." },
];

const DETAILS: DetailLevel[] = [
  { id: "basic", label: "Basic", multiplier: 1, note: "Clean, charming animation with all the essentials." },
  { id: "detailed", label: "Detailed", multiplier: 1.1, note: "Richer backgrounds and more movement in every scene." },
  { id: "premium", label: "Premium", multiplier: 1.3, note: "Our finest work, with lush detail in every frame." },
];

const ADDONS: AddOn[] = [
  { id: "narration", label: "Custom narration", price: 60, note: "A warm voice reads the story aloud." },
  { id: "music", label: "Original music", price: 40, note: "A score written to match their adventure." },
  { id: "master", label: "4K master file", price: 50, note: "A downloadable copy in the highest quality." },
];

const EXTRA_MINUTE_PRICE = 100;
const MAX_EXTRA_MINUTES = 30;

const pct = (multiplier: number) => Math.round((multiplier - 1) * 100);
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const display = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { type: "spring", stiffness: 180, damping: 20 });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return <motion.span>{display}</motion.span>;
}

export function Configurator() {
  const [length, setLength] = useState("medium");
  const [extraMinutes, setExtraMinutes] = useState(0);
  const [detail, setDetail] = useState("basic");
  const [addOns, setAddOns] = useState<string[]>(["narration"]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const tier = LENGTHS.find((o) => o.id === length)!;
  const lvl = DETAILS.find((o) => o.id === detail)!;
  const chosenAddOns = useMemo(() => ADDONS.filter((o) => addOns.includes(o.id)), [addOns]);

  const minutesCost = extraMinutes * EXTRA_MINUTE_PRICE;
  const addOnsCost = chosenAddOns.reduce((s, o) => s + o.price, 0);
  const subtotal = tier.price + minutesCost + addOnsCost;
  const surcharge = Math.round(subtotal * (lvl.multiplier - 1));
  const total = subtotal + surcharge;
  const totalMinutes = tier.minutes + extraMinutes;

  const cart: CheckoutCart = {
    currency: "usd",
    total,
    items: [
      { label: `${tier.label} film (${tier.minutes} min)`, amount: tier.price },
      ...(extraMinutes > 0 ? [{ label: `+${extraMinutes} extra min`, amount: minutesCost }] : []),
      ...chosenAddOns.map((o) => ({ label: o.label, amount: o.price })),
      ...(surcharge > 0
        ? [{ label: `${lvl.label} detail (+${pct(lvl.multiplier)}%)`, amount: surcharge }]
        : []),
    ],
  };

  const toggleAddOn = (id: string) =>
    setAddOns((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const lengthOptions: SegOption[] = LENGTHS.map((o) => ({
    id: o.id,
    label: o.label,
    caption: `${usd(o.price)} · ${o.minutes} min`,
    note: o.note,
  }));
  const detailOptions: SegOption[] = DETAILS.map((o) => ({
    id: o.id,
    label: o.label,
    caption: o.multiplier === 1 ? "Base price" : `+${pct(o.multiplier)}%`,
    note: o.note,
  }));

  return (
    <section
      id="build"
      className="relative overflow-hidden bg-brand-deep py-20 text-white sm:py-28"
      style={{
        backgroundImage:
          "radial-gradient(circle at 10px 10px, rgba(255,249,238,0.08) 2px, transparent 0)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="max-w-2xl">
          <span className="inline-block rotate-[-2deg] rounded-lg border-[3px] border-white bg-brand-pink px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-[3px_3px_0_#fff]">
            Build their video
          </span>
          <AnimatedHeading
            as="h2"
            text="Design their film, watch the price as you go"
            className="mt-6 font-[family-name:var(--font-fredoka)] text-4xl font-bold uppercase leading-[0.95] tracking-tight sm:text-5xl"
          />
          <p className="mt-4 text-lg font-medium text-white/70">
            Pick a length, add any extra minutes, and choose the level of detail. No payment yet.
            This just helps you picture their video.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
          className="mt-12 grid overflow-hidden rounded-[28px] border-[3px] border-brand-deep bg-white text-brand-deep shadow-comic-lg lg:grid-cols-[1fr_350px]"
        >
          {/* Controls */}
          <div className="space-y-9 p-7 sm:p-9">
            <Segmented
              legend="Length"
              name="length"
              options={lengthOptions}
              selected={length}
              onSelect={setLength}
            />
            <RangeSlider
              value={extraMinutes}
              onChange={setExtraMinutes}
              max={MAX_EXTRA_MINUTES}
              totalMinutes={totalMinutes}
              cost={minutesCost}
            />
            <Segmented
              legend="Detail level"
              name="detail"
              options={detailOptions}
              selected={detail}
              onSelect={setDetail}
            />

            <fieldset>
              <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
                Add-ons
              </legend>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {ADDONS.map((o) => {
                  const checked = addOns.includes(o.id);
                  return (
                    <motion.label
                      key={o.id}
                      whileTap={{ scale: 0.94 }}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-full border-[3px] border-brand-deep px-4 py-2.5 text-sm font-bold shadow-comic-sm transition-colors ${
                        checked ? "bg-brand-pink text-white" : "bg-white text-brand-deep"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => toggleAddOn(o.id)}
                      />
                      <span
                        aria-hidden
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-[2px] text-[11px] font-black ${
                          checked ? "border-white bg-white text-brand-pink" : "border-brand-deep text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {o.label}
                      <span className="font-black">+${o.price}</span>
                    </motion.label>
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={chosenAddOns.map((o) => o.id).join("-") || "none"}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="mt-3 text-sm font-medium text-brand-deep/60"
                >
                  {chosenAddOns.length > 0
                    ? chosenAddOns[chosenAddOns.length - 1].note
                    : "Optional touches you can add to make it extra special."}
                </motion.p>
              </AnimatePresence>
            </fieldset>
          </div>

          {/* Summary rail */}
          <div className="border-t-[3px] border-brand-deep bg-brand-yellow p-7 sm:p-9 lg:border-l-[3px] lg:border-t-0">
            <p className="text-xs font-black uppercase tracking-widest text-brand-deep/60">
              Their video so far
            </p>
            <div className="mt-2 flex items-end gap-2">
              <span className="font-[family-name:var(--font-fredoka)] text-7xl font-bold leading-none tabular-nums">
                $<AnimatedNumber value={total} />
              </span>
              <span className="mb-2 text-sm font-black text-brand-deep/55">USD</span>
            </div>
            <p className="mt-1 text-sm font-bold text-brand-deep/55">
              {totalMinutes} minutes · {lvl.label} detail
            </p>

            <ul className="mt-6 space-y-2 border-t-[3px] border-dashed border-brand-deep/25 pt-5 text-sm font-semibold">
              <SummaryRow label={`${tier.label} film (${tier.minutes} min)`} value={usd(tier.price)} />
              <AnimatePresence initial={false}>
                {extraMinutes > 0 && (
                  <motion.div
                    key="extra-min"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <SummaryRow label={`+${extraMinutes} extra min`} value={`+${usd(minutesCost)}`} />
                  </motion.div>
                )}
                {chosenAddOns.map((o) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <SummaryRow label={o.label} value={`+${usd(o.price)}`} />
                  </motion.div>
                ))}
                {surcharge > 0 && (
                  <motion.div
                    key="surcharge"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <SummaryRow
                      label={`${lvl.label} detail (+${pct(lvl.multiplier)}%)`}
                      value={`+${usd(surcharge)}`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </ul>

            <motion.button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              whileHover={{ y: -2 }}
              whileTap={{ y: 1, scale: 0.99 }}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border-[3px] border-brand-deep bg-brand-pink px-6 py-4 text-base font-black uppercase tracking-wide text-white shadow-comic"
            >
              Create their video →
            </motion.button>
            <p className="mt-3 text-center text-xs font-semibold text-brand-deep/60">
              No payment yet. Full preview before we animate.
            </p>
          </div>
        </motion.div>

        <Checkout open={checkoutOpen} cart={cart} onClose={() => setCheckoutOpen(false)} />
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-0.5">
      <span className="text-brand-deep/75">{label}</span>
      <span className="font-black tabular-nums">{value}</span>
    </li>
  );
}

function RangeSlider({
  value,
  onChange,
  max,
  totalMinutes,
  cost,
}: {
  value: number;
  onChange: (v: number) => void;
  max: number;
  totalMinutes: number;
  cost: number;
}) {
  const pctFilled = (value / max) * 100;
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
        Extra minutes
      </legend>
      <div className="mt-4 flex items-center justify-between text-sm font-bold text-brand-deep/70">
        <span>
          +{value} min · {totalMinutes} min total
        </span>
        <span className="font-black tabular-nums text-brand-deep">
          {cost > 0 ? `+${usd(cost)}` : "Included"}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Extra minutes"
        className="mt-3 h-3 w-full cursor-pointer appearance-none rounded-full border-[3px] border-brand-deep outline-none focus-visible:ring-4 focus-visible:ring-brand-pink/40 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-brand-deep [&::-moz-range-thumb]:bg-brand-pink [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-brand-deep [&::-webkit-slider-thumb]:bg-brand-pink"
        style={{
          background: `linear-gradient(to right, var(--color-brand-pink) ${pctFilled}%, var(--color-brand-cream) ${pctFilled}%)`,
        }}
      />
      <p className="mt-3 text-sm font-medium text-brand-deep/60">
        Each extra minute adds ${EXTRA_MINUTE_PRICE} to the base length.
      </p>
    </fieldset>
  );
}

function Segmented({
  legend,
  name,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  name: string;
  options: SegOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const selectedNote = options.find((o) => o.id === selected)?.note;
  return (
    <fieldset>
      <legend className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
        {legend}
      </legend>
      <div className="mt-4 flex gap-1.5 rounded-2xl border-[3px] border-brand-deep bg-brand-cream p-1.5">
        {options.map((o) => {
          const active = selected === o.id;
          return (
            <label key={o.id} className="relative flex-1 cursor-pointer">
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={active}
                onChange={() => onSelect(o.id)}
              />
              {active && (
                <motion.span
                  layoutId={`seg-${name}`}
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-brand-deep shadow-comic-sm"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span
                className={`relative z-10 flex flex-col items-center px-2 py-2.5 text-center transition-colors duration-200 ${
                  active ? "text-white" : "text-brand-deep"
                }`}
              >
                <span className="text-sm font-bold leading-tight">{o.label}</span>
                <span className="mt-0.5 text-xs font-black opacity-80">{o.caption}</span>
              </span>
            </label>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={selected}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="mt-3 text-sm font-medium text-brand-deep/60"
        >
          {selectedNote}
        </motion.p>
      </AnimatePresence>
    </fieldset>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check in the browser**

Run `npm run dev`, open `http://localhost:3000/#build`. Verify:
- Default shows Medium / 0 extra min / Basic / Custom narration selected → total `$510` (450 + 60).
- Switch to Long: tier line `$900`.
- Drag slider to +6: an `+6 extra min` line shows `+$600`, "min total" updates.
- Switch detail to Premium: a `Premium detail (+30%)` line appears; total = round(subtotal × 1.3).
- Toggle add-ons: chips update and line items appear/disappear.
- Confirm the summary line items add up to the big total.
- Click "Create their video" → checkout opens listing the same line items and total.

- [ ] **Step 4: Commit**

```bash
git add components/home/configurator.tsx
git commit -m "Rebuild configurator for video product: tiers, minutes slider, detail multiplier"
```

---

## Task 2: Hero copy

**Files:**
- Modify: `components/home/hero.tsx`

The headline appears twice (a reduced-motion `<h1>` branch and an animated `motion.h1` branch); both must change. Keep all classes, animations, and the `DotField` exactly as they are.

- [ ] **Step 1: Eyebrow badge** — replace `⭐ Brand new!` with `⭐ Brand new`.

- [ ] **Step 2: Headline, reduced-motion branch** — replace the three `<span>` lines:

```tsx
                <span className="block whitespace-nowrap">Pow! A</span>
                <span
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  Storybook
                </span>
                <span className="block whitespace-nowrap">just for YOU!</span>
```

with:

```tsx
                <span className="block whitespace-nowrap">An animated</span>
                <span
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  fairy tale
                </span>
                <span className="block whitespace-nowrap">made for them</span>
```

- [ ] **Step 3: Headline, animated branch** — replace the three `motion.span` lines:

```tsx
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  Pow! A
                </motion.span>
                <motion.span
                  variants={headlineLine}
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  Storybook
                </motion.span>
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  just for YOU!
                </motion.span>
```

with:

```tsx
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  An animated
                </motion.span>
                <motion.span
                  variants={headlineLine}
                  className="block whitespace-nowrap text-brand-pink"
                  style={{ WebkitTextStroke: "2px var(--color-brand-deep)" }}
                >
                  fairy tale
                </motion.span>
                <motion.span variants={headlineLine} className="block whitespace-nowrap">
                  made for them
                </motion.span>
```

- [ ] **Step 4: Speech bubble** — replace:

```
                Drop in their name, hair colour, favourite animal — KAPOW! a hand-illustrated
                hardcover starring your little legend lands at your door.
```

with:

```
                Tell us their name, their curls, their favorite animal. We hand-animate a short
                fairy tale starring your child, ready to watch at home.
```

- [ ] **Step 5: Primary CTA** — replace `Make my book →` with `Create their video →`.

- [ ] **Step 6: Secondary CTA** — replace `See samples` with `Watch a sample`.

- [ ] **Step 7: Social-proof stat** — replace `40,000+ tiny heroes already starring` with `40,000+ children already starring`.

- [ ] **Step 8: Decorative stickers** — replace the `BOOM!` sticker text with `In 4K`, and `✦ Hand-drawn` with `✦ Hand-animated`.

- [ ] **Step 9: Image alt** — replace `alt="Tiny astronaut storybook character"` with `alt="Hand-animated astronaut character"`.

- [ ] **Step 10: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add components/home/hero.tsx
git commit -m "Rewrite hero copy for video product"
```

---

## Task 3: Categories copy + fix dead link

**Files:**
- Modify: `components/home/categories.tsx`

Keep the 6 story worlds and their blurbs (they describe story content and work for video). Only the eyebrow, intro, card link target, and CTA label change.

- [ ] **Step 1: Eyebrow** — replace `Storybook collections` with `Story worlds`.

- [ ] **Step 2: Intro paragraph** — replace:

```
            Every story is personalized with your child&apos;s name and likeness. Choose the
            adventure that feels most like them.
```

with:

```
            Every film is personalized with your child&apos;s name and likeness. Choose the
            adventure that feels most like them.
```

- [ ] **Step 3: Fix dead link** — in the card `<a>`, replace `href="#"` with `href="#build"` (CLAUDE.md requires every link lead somewhere real).

- [ ] **Step 4: Card CTA** — replace `Peek inside` with `Watch a sample`.

- [ ] **Step 5: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/home/categories.tsx
git commit -m "Rewrite categories copy and fix dead card link"
```

---

## Task 4: FAQ copy

**Files:**
- Modify: `components/home/faq.tsx`

Replace the entire `FAQS` array with the version below (digital delivery, preview, ages, data, changes, personalization, and a new format/quality question). Leave the heading, eyebrow, and component structure unchanged.

- [ ] **Step 1: Replace the `FAQS` array**

```tsx
const FAQS = [
  {
    q: "How soon will the video be ready?",
    a: "Most videos are animated and delivered within two weeks, and we'll email you at every step along the way.",
  },
  {
    q: "Can I see it before it's final?",
    a: "Yes. We send a full preview, and you can ask for changes before we finish the final cut.",
  },
  {
    q: "What ages is this made for?",
    a: "The stories are written for children from about two to eight years old, and they tend to be watched again and again.",
  },
  {
    q: "How do you use my child's details?",
    a: "Only to create your video. We never sell your information, and you can ask us to delete it at any time.",
  },
  {
    q: "What if I need to change something?",
    a: "Just reply to your confirmation email. We're glad to adjust names and the little details.",
  },
  {
    q: "Is it really personalized, or just a name swap?",
    a: "It's truly personalized. Your child's name, hair, and the details you share are animated into the story by a real artist.",
  },
  {
    q: "How do I watch it, and what quality?",
    a: "You'll get a private link to stream or download in crisp HD. A 4K master file is available as an add-on.",
  },
];
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/home/faq.tsx
git commit -m "Rewrite FAQ for video product"
```

---

## Task 5: CTA banner copy

**Files:**
- Modify: `components/home/cta-banner.tsx`

- [ ] **Step 1: Stickers** — replace `✦ Handmade` with `✦ Hand-animated`, and `Ships in 2 weeks` with `Ready in 2 weeks`.

- [ ] **Step 2: Body paragraph** — replace:

```
          Add their name, choose an adventure, and we&apos;ll handcraft the rest. A keepsake they&apos;ll
          ask for again and again.
```

with:

```
          Add their name, choose an adventure, and we&apos;ll animate the rest. A keepsake they&apos;ll
          ask for again and again.
```

- [ ] **Step 3: Primary button** — replace `Create your book →` with `Create their video →`.

- [ ] **Step 4: Secondary button** — replace `See sample books` with `Watch samples`.

- [ ] **Step 5: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/home/cta-banner.tsx
git commit -m "Rewrite CTA banner copy for video product"
```

---

## Task 6: Footer copy

**Files:**
- Modify: `components/home/site-footer.tsx`

- [ ] **Step 1: Brand blurb** — replace:

```
              Handmade storybooks starring your child. Written with care, illustrated by a real
              artist, and made to be read again and again.
```

with:

```
              Hand-animated fairy tales starring your child. Written with care, animated by a real
              artist, and made to be watched again and again.
```

- [ ] **Step 2: Link label** — in the `Support` column, replace the link label `Shipping` with `Delivery` (leave its `href: "/#faq"` unchanged).

- [ ] **Step 3: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/home/site-footer.tsx
git commit -m "Rewrite footer copy for video product"
```

---

## Task 7: Page metadata

**Files:**
- Modify: `app/layout.tsx:23-27`

- [ ] **Step 1: Update the `metadata` export** — replace:

```tsx
export const metadata: Metadata = {
  title: "Yours Fairy Tale — Personalized storybooks for every child",
  description:
    "Create custom illustrated fairy tales starring your child. Choose adventures, characters, and keepsake portraits.",
};
```

with:

```tsx
export const metadata: Metadata = {
  title: "Yours Fairy Tale — Personalized animated videos for every child",
  description:
    "Create a custom animated fairy tale starring your child. Choose an adventure, a length, and the level of detail.",
};
```

- [ ] **Step 2: Typecheck** — Run: `npx tsc --noEmit`. Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "Update site metadata for video product"
```

---

## Task 8: Final verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Grep for stray book/SFX language on the homepage**

Run:
```bash
grep -rniE "storybook|hardcover|softcover|\\bbook\\b|pow!|kapow|boom!|ships in|illustrated|page count|colour|favourite" components/home app/layout.tsx app/page.tsx
```
Expected: no matches. (The decorative "BOOM!" sticker is gone; "illustrated" should not remain in home copy.) Investigate and fix anything that prints. Do not touch `app/blog`, `/legacy-examples`, or the concept pages.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds with no type or lint errors.

- [ ] **Step 3: Full manual walkthrough**

Run `npm run dev`, load `http://localhost:3000/`. Scroll the whole page top to bottom:
- Hero reads as the video product, both CTAs scroll to their anchors (`#build`, `#collections`).
- Categories cards link to `#build`; "Watch a sample" label present.
- Configurator behaves per Task 1 Step 3.
- FAQ, CTA banner, and footer all read as the video product.
- Toggle OS "reduce motion" and confirm the slider, animated total, and headline still work.

- [ ] **Step 4: Final commit (if the grep sweep required fixes)**

```bash
git add -A
git commit -m "Final copy sweep for video product switch"
```

---

## Self-review notes

- **Spec coverage:** configurator math/slider/detail/add-ons (Task 1), hero (Task 2), categories + dead link (Task 3), FAQ incl. format/quality (Task 4), CTA banner (Task 5), footer (Task 6), metadata (Task 7, beyond spec but necessary), verification incl. grep sweep (Task 8). Blog/legacy/concept pages explicitly excluded.
- **Pricing invariants:** all base amounts are multiples of $10, so `Math.round(subtotal × multiplier)` yields clean integers; summary line items (`tier + extra min + add-ons + surcharge`) sum to `total` by construction, and the `CheckoutCart` is built from the same parts.
- **Type consistency:** `SegOption` (`caption`, not `price`) is used by both `lengthOptions` and `detailOptions`; `RangeSlider` and `Segmented` props match their call sites; `usd`/`pct`/`EXTRA_MINUTE_PRICE` are module-level and referenced consistently.
```
