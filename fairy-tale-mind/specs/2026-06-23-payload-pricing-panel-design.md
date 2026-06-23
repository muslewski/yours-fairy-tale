---
title: Payload pricing panel — admin-editable pricing
date: 2026-06-23
status: designed (not yet planned/built)
kind: spec
relatedTo: 2026-06-23-pricing-update-design.md
---

# Payload pricing panel (later cycle)

Make all configurator pricing editable from the Payload studio instead of
hardcoded in `lib/pricing.ts`. Captured now so the design isn't lost; **not**
implemented in the 2026-06-23 price-change cycle. Gets its own plan + branch
when scheduled.

## Goal

One "Pricing" screen in the studio sidebar where an admin edits, with no deploy:

- each length tier's base price (and label/minutes/note)
- the extra-minute price (and max extra minutes)
- each detail level's multiplier (restores per-level surcharge differentiation)
- each add-on's price (and label/note)

## Shape: a Payload Global (singleton)

Pricing is one config object, not a list of records → a Payload **Global**
`pricing` is the idiomatic fit and yields a single clean edit screen (vs. a
collection of loose rows).

Fields:

- `lengths` — array of `{ id, label, minutes (number), price (number), note }`
- `details` — array of `{ id, label, multiplier (number), note }`
- `addOns` — array of `{ id, label, price (number), note }`
- `extraMinutePrice` — number
- `maxExtraMinutes` — number

`id` fields are the stable keys the order/checkout reference; validate they stay
in sync with what orders may have stored. Consider making `id` read-only / a
fixed select to avoid an admin renaming `short` and breaking historical orders.

## Access control

- **read: public** — both the client configurator and the server checkout need
  the values.
- **update: admin-only** — pricing is money; lock writes to admins.

## Refactor of `lib/pricing.ts`

Decouple math from data source:

- Keep the current constants (`LENGTHS`, `DETAILS`, `ADDONS`,
  `EXTRA_MINUTE_PRICE`, `MAX_EXTRA_MINUTES`) as **fallback defaults**.
- Change the math to **pure functions** taking the pricing config explicitly:
  `computeTotalCents(sel, pricing)` and `summarizeSelections(sel, pricing)`.
  `resolve()` likewise takes `pricing`.
- A thin resolver loads the global and falls back to defaults if the global is
  unseeded or the fetch fails — so a DB hiccup never breaks checkout.

## Data flow

- **Checkout route** (`app/api/stripe/checkout/route.ts`, authoritative charge):
  read the `pricing` global via Payload local API server-side, pass it into
  `computeTotalCents`. This is the number the customer pays — always read fresh
  (or short-TTL cached), never trust a client-sent price.
- **Configurator** (client component): the page's server component reads the
  global and passes the resolved pricing down as props. Configurator becomes
  display-only over injected data instead of importing constants.
- **Caching:** the global changes rarely; cache reads (Next.js cache / tag) and
  revalidate on global update so the studio edit reflects quickly without a
  per-request DB hit.

## Seeding

Seed the global with the post-2026-06-23 values (the price-change cycle's
numbers) so the panel's first state equals what's live, then admins adjust.

## Risks / watch-items

- **Authoritative-price integrity:** the checkout must recompute from the global
  server-side; never accept a price from the client. Keep the existing test that
  shown==charged.
- **Stale id drift:** renaming/removing an `id` that historical orders reference.
  Guard ids (read-only or fixed set).
- **Cache staleness vs. correctness:** configurator display may briefly lag a
  price edit; checkout must not — it reads authoritative.
- Migration: existing orders store their own resolved totals already (verify),
  so repricing the global must not retroactively change past orders.

## Status

Design only. Needs its own `writing-plans` pass + feature branch when
prioritized. Tracked in `fairy-tale-mind/tech-debt/`.
