@AGENTS.md

# Yours Fairy Tale

Personalized, hand-illustrated hardcover storybooks starring a customer's child. Parents add their child's name, hair color, favorite animal, etc., and receive a custom illustrated keepsake book.

## Project structure

- `/` ([app/page.tsx](app/page.tsx)) — the **live homepage**. This is the real site we build forward.
- `/legacy-examples` ([app/legacy-examples/page.tsx](app/legacy-examples/page.tsx)) — gallery of 10 hero design concepts.
- `app/<n>-<slug>/` — the 10 concept pages, **frozen as an archive**. Don't refactor these unless asked; new work goes on the live homepage.

## Design system

**Colors — never hardcode hex.** The brand palette is the single source of truth in [app/globals.css](app/globals.css). Use Tailwind utilities (`bg-brand-yellow`, `text-brand-deep`, `border-brand-deep`) or, for shadows/inline styles/arbitrary values, the CSS variable (`var(--color-brand-deep)`).

| Token | Hex | Role |
|-------|-----|------|
| `brand-yellow` | `#faca23` | sunshine · primary surface |
| `brand-pink` | `#f042d2` | magenta · highlight |
| `brand-blue` | `#17c7e2` | sky · accent |
| `brand-deep` | `#1a1033` | ink · text & outlines |
| `brand-cream` | `#fff9ee` | paper · page background (default `bg`) |

**Fonts** (CSS vars, defined in [app/layout.tsx](app/layout.tsx)): `--font-fredoka` (display/headlines), `--font-quicksand` (body/UI), `--font-fraunces` (editorial accents).

**Stack:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 (CSS-first `@theme`, no `tailwind.config`).

**Animation:** use **Motion** (Framer Motion, imported from `motion/react`) for interactive/animated UI — don't add another animation library. Motion components require `"use client"`. Guard motion with `useReducedMotion()` where it would otherwise move on its own.

**Comic shadows:** the signature hard offset shadow is tokenized — use `shadow-comic` / `shadow-comic-sm` / `shadow-comic-lg` instead of hardcoding `shadow-[...]`.

**Hover lifts — avoid the edge-jitter trap.** Never put a movement (`hover:-translate-*`) on the *same element that detects the hover*: near its edges the element slides out from under the cursor, the hover ends, it snaps back, and you get an infinite flicker. Instead either:
1. Put `group` on a stable ancestor that does **not** move (e.g. the wrapping `<li>`) and apply the lift via `group-hover:` on the inner element, or
2. Use a non-moving hover effect such as `hover:shadow-comic-lg`.

(Tailwind v4 compiles `translate-*` to the native CSS `translate` property, not `transform` — read `getComputedStyle(el).translate` when testing.)

## Navigation & CTAs

**Every CTA and nav link must lead somewhere real** — scroll to an in-page section anchor (or a route), never a dead `href="#"`. When you add a section, give its `<section>` an `id` and point the matching CTAs at it. In-page anchors rely on `scroll-behavior: smooth` (set on `html` in [app/globals.css](app/globals.css), disabled under `prefers-reduced-motion`).

Homepage section anchors:
- `#build` — the configurator. Target for primary "make / create your book" CTAs and the nav **Start** button.
- `#collections` — the categories grid. Target for "see samples / browse" CTAs.

## Brand voice

Calm, warm, sincere, keepsake-focused. We speak to the **parent/gift-giver**; the **child is the hero**. American English. We do **not** shout — no comic-book SFX ("Pow!", "Kapow!", "Boom!"), no hype, sparse exclamation points.

**Before writing or editing any user-facing copy** (headlines, CTAs, microcopy, errors, empty states), use the `brand-voice` skill in [.claude/skills/brand-voice/SKILL.md](.claude/skills/brand-voice/SKILL.md) for the full guide.
