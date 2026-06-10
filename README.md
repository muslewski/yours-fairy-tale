# Yours Fairy Tale

Personalized animated fairy-tale videos starring a customer's child. The
parent shares a few photos and details; we deliver a short cinematic film
with their child as the hero. The parent is the buyer, the child is the hero.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind v4 · Payload CMS v3 on
Postgres/Neon · Better Auth (magic-link customer sign-in) · Stripe Checkout ·
Resend · Vercel (deploy + Blob storage).

## Getting started

1. `npm ci`
2. `cp .env.example .env` and fill it in (see the comments in that file)
3. `npm run dev` → http://localhost:1234

The Payload admin lives at `/admin` (staff accounts in the `admins`
collection). Customer accounts are created ONLY by the Stripe webhook after a
purchase; customers sign in at `/sign-in` with a magic link.

The staff order panel lives at `/studio` (same `admins` login as `/admin`):
revenue, the order queue, status workflow, video delivery, and the customer's
delivery promise.

## Tests

- `npm test` — vitest, DB-backed against the database in `.env.test`
  (falls back to `.env`)
- `npm run test:e2e` — Playwright Layers A (mocked) + B (DB-seeded)
- `npm run test:e2e:smoke` — Layer C, real Stripe test-mode purchase;
  requires `stripe listen --forward-to localhost:3100/api/stripe/webhook`

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
