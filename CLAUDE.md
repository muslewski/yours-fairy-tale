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

## Brand voice

Calm, warm, sincere, keepsake-focused. We speak to the **parent/gift-giver**; the **child is the hero**. American English. We do **not** shout — no comic-book SFX ("Pow!", "Kapow!", "Boom!"), no hype, sparse exclamation points.

**Before writing or editing any user-facing copy** (headlines, CTAs, microcopy, errors, empty states), use the `brand-voice` skill in [.claude/skills/brand-voice/SKILL.md](.claude/skills/brand-voice/SKILL.md) for the full guide.
