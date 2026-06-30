<div align="center">

<img src=".github/banner.svg" alt="Yours Fairy Tale — an animated fairy tale made for them." width="100%" />

# Yours Fairy Tale

**Personalized animated fairy tales starring your child.**

Parents share a few photos and a plot idea; we deliver a short cinematic film
with their child as the hero, a keepsake to watch again and again.

<br />

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Payload](https://img.shields.io/badge/Payload-3-000000?logo=payloadcms&logoColor=white)](https://payloadcms.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql&logoColor=white)](https://neon.tech)
[![Better Auth](https://img.shields.io/badge/Better_Auth-magic_link-1E1E1E)](https://better-auth.com)
[![Stripe](https://img.shields.io/badge/Stripe-Checkout-635BFF?logo=stripe&logoColor=white)](https://stripe.com)

[![Test](https://github.com/muslewski/yours-fairy-tale/actions/workflows/test.yml/badge.svg)](https://github.com/muslewski/yours-fairy-tale/actions/workflows/test.yml)

</div>

---

## What it is

Personalized animated fairy-tale videos starring a customer's child. The parent
shares a few photos and light details (name, favorite animal, a plot idea) and
receives a short, cinematic film with their child as the hero. The parent is the
buyer; the child is the hero.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router) · **React 19** · **TypeScript 5** |
| Styling | **Tailwind CSS 4** (CSS-first `@theme`, no config) · **Motion** |
| Backend / CMS | **Payload CMS 3** — admin at `/admin`, staff order panel at `/studio` |
| Database | **PostgreSQL** (Neon) via `@payloadcms/db-postgres` |
| Auth | **Better Auth** (magic-link customer sign-in) + Payload admin auth |
| Payments | **Stripe** Checkout + webhooks |
| Email | **Resend** |
| Storage | **Vercel Blob** (access-gated customer media) |
| Testing | **Vitest** (DB-backed) · **Playwright** (mocked + seeded layers) |
| Deploy | **Vercel** — DB migrations run on boot |

## Getting started

1. `npm ci`
2. `cp .env.example .env` and fill it in (see the comments in that file)
3. `npm run dev` → http://localhost:1234

The Payload admin lives at `/admin` (staff accounts in the `admins` collection).
Customer accounts are created ONLY by the Stripe webhook after a purchase;
customers sign in at `/sign-in` with a magic link.

The staff order panel lives at `/studio` (same `admins` login as `/admin`):
revenue, the order queue, status workflow, video delivery, and the customer's
delivery promise.

Media lives in two collections: `site-media` (public, admin-managed brand
imagery, direct CDN URLs) and `media` (customer photos/proofs/videos,
access-controlled and served only through ownership-gated routes).

## Tests

- `npm test` — vitest, DB-backed against the database in `.env.test`
  (falls back to `.env`)
- `npm run test:e2e` — Playwright Layers A (mocked) + B (DB-seeded)
- `npm run test:e2e:smoke` — Layer C, real Stripe test-mode purchase;
  requires `stripe listen --forward-to localhost:3100/api/stripe/webhook`

CI (`.github/workflows/test.yml`) runs typecheck, vitest, and Playwright A/B on
every pull request and every push to `main`.

## Where everything is explained

This repo has a knowledge base at `fairy-tale-mind/` (the Mind): zone cards
mapping every area of the code, decision records, and an honest tech-debt
register. Start at `fairy-tale-mind/map/product.md`, then
`fairy-tale-mind/map/index.md`. Conventions (design tokens, brand voice,
section waves) live in `CLAUDE.md` and `.claude/skills/`.

## Deploying

Production deploys run DB migrations automatically on boot
(`instrumentation.ts`) and fail closed if any required production env var
(see `lib/required-env.ts`) is missing in the Vercel project settings.
