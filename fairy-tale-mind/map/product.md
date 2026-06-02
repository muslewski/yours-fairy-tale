---
type: brief
summary: "Yours Fairy Tale sells personalized, hand-animated fairy-tale videos starring a customer's child. The parent is the buyer; the child is the hero. Read this first to grasp what we're building and why."
tags: [product, north-star]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[homepage]]", "[[configurator]]", "[[series]]", "[[journal]]", "[[checkout]]"]
sources: ["[[pivot-to-animated-videos]]", "[[personalization-from-photos]]", "[[2026-06-02-product-brief-design]]"]
---

# Yours Fairy Tale — what we're building

**Read this first.** The zone cards tell you *what code lives where*. This tells you
*what the product is and what each surface is trying to do*, so you don't reverse-engineer
intent from markup.

## What it is

A personalized, **hand-animated fairy-tale video** starring the customer's own child.
The parent **sends a few photos** (so the animated hero carries the child's real likeness)
plus a few light details (their name, a favorite animal, a plot), and receives a short,
**cinematic** custom film with their child as the hero, **in HD**. The homepage says it
plainly: *"An animated fairy tale made for them."* Social proof on the hero: *"40,000+
children already starring."* (Personalization mechanic: `[[personalization-from-photos]]`.)

> Note: this product **pivoted from hand-illustrated hardcover books to animated videos**
> (`[[pivot-to-animated-videos]]`). Live copy and `app/layout.tsx` metadata say *videos*;
> some older copy/docs still say *books* (tracked as `[[claude-md-says-hardcover]]` and
> `[[checkout-readme-stale]]`). When in doubt, the product is **videos**.

## Who it's for

We speak to the **parent / gift-giver**; the **child is the hero**. The voice is calm,
warm, sincere, keepsake-focused — never hype, never comic-book SFX (see the `brand-voice`
skill). The emotional promise is a treasured keepsake, *"a keepsake they'll ask for again
and again."*

## The offer / how it works

1. **Share photos + a few details** — a few photos give the animated hero the child's real
   likeness; light details (name, favorite animal) shape the story.
2. **Choose a plot** — pick one of the ready story worlds (the homepage `#collections` grid:
   Bedtime adventures, Outer space, Under the sea, Enchanted forest, Dragons and castles,
   Birthday surprise) **or create your own**.
3. **Configure** — the `[[configurator]]` (`#build`): length and level of detail, framed as
   no-commitment (*"No payment yet. This just helps you picture their video."*).
4. **Check out** — the `[[checkout]]` looks and behaves like Stripe embedded checkout but
   is a **simulation**: no network calls, no charges (`[[checkout-is-a-simulation]]`). It
   exists to demonstrate the flow, not to take real money.

Headline CTAs throughout: *"Create their video"* / *"Watch a sample."*

## Positioning & brand

Bright, playful, **comic-storybook** visual language — thick deep-ink outlines, hard
offset "comic" shadows, a sunshine-yellow/cream/magenta/sky/ink palette, and curtain-style
wave dividers between sections (`[[design-system]]`, `[[section-waves]]`). The *visuals*
are loud and fun; the *words* stay quiet and heartfelt. A first-visit "storybook curtain"
preloader (`[[site-preloader]]`) sets the tone.

## The page story (the funnel, surface by surface)

- **Homepage** (`[[homepage]]`, `/`) — the pitch, as a vertical narrative:
  hero (the promise) → `#collections` (the story worlds) → `#build` (configure your video)
  → series teaser (the upsell) → FAQ (objection handling) → CTA banner (final ask). The
  FAQ answers the real buyer worries: how soon it's ready, can I preview it, what ages,
  how you use my child's details, can I change it, *"is it really personalized or just a
  name swap?"*, and how/where I watch it.
- **The Series** (`[[series]]`, `/series`) — the premium upsell: *"Give them a whole
  series, not just one story"* — an ongoing animated show of ~twenty episodes with the
  child as the recurring hero, delivered in a dedicated iOS/Android app. Marked
  **"Premium · coming soon"**, so the surface's job today is to **collect waitlist signups**,
  not sell.
- **The Journal** (`[[journal]]`, `/blog`) — *"Notes from the studio"*: gentle posts on
  books, bedtime, and small keepsake moments (e.g. a gentle bedtime routine, a note for
  grandparents, a story for a shy child). Its job is **trust, brand warmth, and SEO**, not
  direct conversion.

## Reality for future agents

- **Design-forward, not a live business yet.** `yoursfairytale.com` is not deployed; the
  checkout is a simulation; the configurator collects no payment. Treat it as a polished
  product *prototype*.
- **`legacy-examples`** holds 10 frozen hero-concept pages — a design archive, not built
  forward. The live product is the homepage + `/series` + `/blog`.
- **Known rough edges** are filed in `fairy-tale-mind/tech-debt/` (the books→videos copy
  drift, a placeholder nav label, dead footer links, a hydration mismatch). Check there
  before assuming something is intentional.
- **Conventions** that carry the product: the `brand-voice` skill (how we write to
  parents) and the `section-waves` skill (how sections transition). Honor both.
