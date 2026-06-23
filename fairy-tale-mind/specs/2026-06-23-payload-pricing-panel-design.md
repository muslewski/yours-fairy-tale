---
title: Payload pricing panel — admin-editable pricing
date: 2026-06-23
status: approved
kind: spec
relatedTo: 2026-06-23-pricing-update-design.md
---

# Payload pricing panel

Make all configurator pricing editable from the Payload studio instead of
hardcoded in `lib/pricing.ts`. Approved 2026-06-23; this is the build spec.

## Verified starting facts (from the wiring map)

- **No Payload Global exists yet** — `payload.config.ts` has `collections` + a
  `vercelBlobStorage` plugin but no `globals: []`. This is the repo's first
  Global → it adds a `pricing` table → **needs a migration** (postgresAdapter,
  `migrations/` dir, prod applies migrations not `push`).
- Payload instance: `getPayloadClient()` in `lib/payload.ts` (memoized
  `getPayload({ config })` via the `@payload-config` alias).
- The configurator is a **client** component. Direct `@/lib/pricing` imports:
  `components/home/configurator/index.tsx` (`LENGTHS/DETAILS/ADDONS/EXTRA_MINUTE_PRICE/summarizeSelections`),
  `step-film.tsx` (`ADDONS/MAX_EXTRA_MINUTES`), `range-slider.tsx`
  (`EXTRA_MINUTE_PRICE`), `price-rail.tsx` (types only). It receives no pricing
  props today. Rendered by `app/(site)/page.tsx` (server component).
- Checkout authoritative path: `lib/checkout.ts:61-62` calls
  `computeTotalCents(selections)` + `summarizeSelections(selections)`; route is
  `app/api/stripe/checkout/route.ts`.
- `collections/Orders.ts` stores `amountTotalCents` as **history** ("Not
  recomputed from pricing"), so repricing the global never alters past orders. ✓
- No `revalidateTag`/`unstable_cache`/`revalidatePath` exists yet — this work
  introduces the first one. `payload-types.ts` is not generated yet.

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

## Refactor of `lib/pricing.ts` (defaulted param — minimal churn)

Decouple math from data source without breaking any existing call site:

- New `Pricing` type bundling
  `{ lengths: LengthTier[]; details: DetailLevel[]; addOns: AddOn[]; extraMinutePrice: number; maxExtraMinutes: number }`.
- The current constants (`LENGTHS`, `DETAILS`, `ADDONS`, `EXTRA_MINUTE_PRICE`,
  `MAX_EXTRA_MINUTES`) are bundled into `DEFAULT_PRICING` and kept exported (so
  nothing that imports them breaks).
- Math becomes `computeTotalCents(sel, pricing = DEFAULT_PRICING)` and
  `summarizeSelections(sel, pricing = DEFAULT_PRICING)`; internal `resolve()`
  takes `pricing`. **The defaulted param means every existing call (`fn(sel)`)
  and every existing test keeps compiling and passing** — we add new tests for
  the `(sel, pricing)` path rather than rewriting the suite.

## Server resolver: `lib/pricing-source.ts` (new, server-only)

- `getPricing(): Promise<Pricing>` → `getPayloadClient().findGlobal({ slug: "pricing" })`,
  maps the doc → `Pricing`. **Falls back to `DEFAULT_PRICING`** when the global
  is unseeded/empty or the read throws — a DB hiccup never breaks checkout.
- Wrapped in `unstable_cache` tagged `"pricing"` so reads don't hit the DB per
  request; the global's `afterChange` hook calls `revalidateTag("pricing")` so a
  studio edit propagates without a deploy.
- Server-only (imports `getPayloadClient`); never imported into a client bundle.

## Data flow

- **Checkout route** (`app/api/stripe/checkout/route.ts`, authoritative charge):
  `const pricing = await getPricing()` → `buildCheckoutSessionParams(selections, pricing)`
  → threads into `computeTotalCents`/`summarizeSelections`. Recomputed
  server-side; the request body still carries selections, never a price.
- **Configurator** (client): `app/(site)/page.tsx` (server) calls `getPricing()`
  and passes `pricing` as a prop into `<Configurator pricing={pricing} />`, which
  threads it to `step-film` / `range-slider` / `price-rail`. Those drop their
  direct constant imports (keep the type imports — `Pricing`/`LengthTier`/… stay
  declared in `lib/pricing.ts`).

## Migration + seeding

- `npm run generate:types` adds the `Pricing` global type to `payload-types.ts`.
- `npm run migrate:create` generates the `pricing`-table migration; commit it.
- Each global field carries `defaultValue` = the current **live** numbers
  (post-2026-06-23: $180/$290/$580, $55, flat ×1.0 multipliers, $10/$10/$25),
  so the admin opens the panel pre-filled and the resolver's fallback equals the
  seeded state. No separate seed script needed.

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

## Production DB migration — the gated risk ⚠️

Adding the Global creates a new `pricing` table. This is a flagged high-risk
category and the repo already carries `[[no-production-db-migrations]]` debt.
Plan: generate + commit the migration with the code; **applying it to prod is a
deliberate human step surfaced at the end gate — never auto-run.** Locally,
Payload dev `push` syncs the schema so the panel is testable without the prod
migration.

## Out of scope

- No new add-on/tier/world *types* — same id vocabulary, now editable values.
- No per-customer or time-boxed pricing, no coupons (Stripe promo codes already
  handle discounts). YAGNI.

## Status

Approved — ready for `writing-plans`. Tracked in
`fairy-tale-mind/tech-debt/payload-pricing-panel.md`.
