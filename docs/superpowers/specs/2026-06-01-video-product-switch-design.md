# Switch the product: storybook → personalized animated video

**Date:** 2026-06-01
**Status:** Approved (brainstorming), ready for implementation plan

## Summary

Yours Fairy Tale currently sells hand-illustrated hardcover storybooks. We are
switching the live product to a **personalized animated video** — a short
animated fairy tale starring the customer's child. This is a content + pricing
change on the live homepage; the brand, palette, fonts, and comic-book visual
styling stay exactly as they are.

Scope decisions made during brainstorming:

- **Full homepage rewrite** — every home section, not just the configurator.
- **Blog excluded** — the 10 Journal markdown posts are a separate archive and
  get their own pass later. Do not touch `app/blog` or the markdown content.
- **Legacy/concept pages excluded** — the 10 archived concept pages and
  `/legacy-examples` are frozen; do not touch them.

## Product

A personalized, hand-animated video starring the customer's child. The parent
provides the child's details (name, likeness, favorite things); we produce a
custom animated fairy tale they receive as a digital video (no physical
shipping). Keepsake framing stays — it's a treasured, made-just-for-them gift.

## 1. Configurator (`components/home/configurator.tsx`)

The central rebuild. Replaces cover/length/extras with **Length tier + extra
minutes slider + Detail level + video add-ons**.

### Controls

**Length (tier — sets base price and base minutes):**

| id | label | minutes | price |
|--------|--------|---------|-------|
| short  | Short  | 3 min   | $300  |
| medium | Medium | 5 min   | $450  |
| long   | Long   | 10 min  | $900  |

Rendered with the existing `<Segmented>` control.

**Extra minutes (slider):** a new `<RangeSlider>` control.
- `<input type="range">`, range **0 → 30** extra minutes, step 1, default 0.
- Each extra minute = **+$100**, added on top of the chosen tier's base minutes.
- Keyboard-accessible native range input; Motion used only for the visual
  thumb/fill polish, guarded by `useReducedMotion()`.
- Displays current total minutes (`tier.minutes + extra`) and the extra cost.

**Detail level (multiplies the full subtotal):** existing `<Segmented>` control.

| id | label | multiplier | shown as |
|----------|----------|------------|----------|
| basic    | Basic    | 1.0        | base price |
| detailed | Detailed | 1.1        | +10% |
| premium  | Premium  | 1.3        | +30% |

**Add-ons (video extras — replaces "Finishing touches"):** same multi-select
chip UI as today. Flat amounts, added to the subtotal *before* the detail
multiplier (so they scale with detail level, per decision).

| id | label | price |
|-----------|--------------------------|-------|
| narration | Custom narration         | +$60  |
| music     | Original music track     | +$40  |
| master    | Downloadable 4K master   | +$50  |

(Labels/notes finalized via the brand-voice skill during implementation.)

### Pricing math

```
subtotal = tier.price + (extraMinutes * 100) + sum(selected addon prices)
surcharge = round(subtotal * (detail.multiplier - 1))   // 0 for Basic
total = subtotal + surcharge
```

All base values are multiples of $10, so the multiplier produces clean integers;
`Math.round` guards against any float drift.

### Summary rail + checkout

The summary rail lists, in order:
- the tier (e.g. "Short — 3 min", base price)
- an extra-minutes line when `extraMinutes > 0` (e.g. "+6 min", `+$600`)
- each selected add-on
- a detail surcharge line when the level isn't Basic
  (e.g. "Detailed (+10%)", `+$<surcharge>`)
- the animated grand total (reuse `<AnimatedNumber>`)

The `CheckoutCart` mirrors these as line items whose `amount`s sum exactly to
`total` (base items at face value + the surcharge line). Nothing in the
`Checkout` component changes — only the cart we pass it.

## 2. Copy rewrite (every home section)

All user-facing copy goes through the **brand-voice skill** before writing.
Brand voice: calm, warm, sincere, keepsake-focused, American English, speaks to
the parent, child is the hero, **no comic SFX**, sparse exclamation points.

- **Hero (`hero.tsx`)** — rewrite headline (currently "Pow! A Storybook just for
  YOU!"), speech bubble, both CTAs ("Make my book" → make/create their video),
  the social-proof stat, the `Image` `alt`, and the decorative SFX stickers
  ("BOOM!", "Hand-drawn" → video-appropriate, e.g. "Hand-animated"). Keep the
  comic *visual* styling, animations, and `DotField` background. Bring the prose
  in line with brand voice (drop "Pow!/KAPOW!/BOOM!" from the actual text — the
  reduced-motion `<h1>` branch and the animated branch both need updating).
- **Categories (`categories.tsx`)** — keep the 6 story worlds; reword the eyebrow,
  intro paragraph, and blurbs lightly for video; "Peek inside" → "Watch a sample"
  (or brand-voice equivalent). **Fix the dead `href="#"`** on each card to point
  at `#build` (CLAUDE.md requires every link lead somewhere real).
- **FAQ (`faq.tsx`)** — rework the 6 Q&As for a digital video product: delivery
  time (no shipping), digital preview before final, ages, data handling,
  requesting changes, "is it really personalized," and format/resolution.
- **CTA banner (`cta-banner.tsx`)** — rewrite heading/body, the "Ships in 2 weeks"
  sticker → "Ready in days" (or similar), and both buttons → video wording.
- **Footer (`site-footer.tsx`)** — brand blurb ("Handmade storybooks…" → animated
  tales), the "Shipping" link label → "Delivery", "See sample books" wording, and
  the newsletter microcopy if it implies books. Keep all hrefs/structure.
- **Nav (`site-nav.tsx`)** — leave structure and the existing (already unusual)
  labels; only adjust anything that explicitly implies a book. Anchors unchanged.

## Out of scope

- `app/blog/**` and all Journal markdown posts.
- `/legacy-examples` and the 10 archived concept pages (`app/<n>-<slug>/`).
- Any change to the design system (`globals.css`), fonts, palette, or the
  `Checkout` component internals.
- Real payment wiring (checkout stays the existing mock).

## Testing / verification

- Manual: run the dev server, open `#build`, exercise every control. Verify:
  tier switches change base; slider adds $100/min and updates total minutes;
  detail level scales the whole subtotal; add-ons add before the multiplier;
  summary line items sum to the displayed total; checkout opens with a matching
  cart.
- Reduced-motion: confirm the slider and animated total behave with
  `prefers-reduced-motion`.
- Lint/build pass (`next lint`, `next build`).
- Grep the homepage tree for stray "book", "storybook", "hardcover", "Pow",
  "KAPOW", "BOOM", "ships", "print" to catch missed copy.
```
