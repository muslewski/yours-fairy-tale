# Pricing in a Payload Global, with a code fallback

**Date:** 2026-06-23
**Status:** decided (code shipped on branch `feat/payload-pricing-panel`; prod migration pending)

## What

Configurator/checkout pricing moved from hardcoded `lib/pricing.ts` constants
into an admin-editable Payload **Global** (`globals/Pricing.ts`, slug `pricing`):
tier base prices, the extra-minute price, detail multipliers, add-on prices, and
`maxExtraMinutes`. Read by `getPricing()` (`lib/pricing-source.ts`) server-side;
threaded into the configurator (a prop from `app/(site)/page.tsx`) and the
authoritative Stripe charge (the checkout route).

## Why these choices

- **Global, not a collection.** Pricing is one config object, not a list of
  records — a Global is the idiomatic single-screen fit.
- **Defaulted param, not a rewrite.** `computeTotalCents(sel, pricing = DEFAULT_PRICING)`
  and `summarizeSelections(sel, pricing = DEFAULT_PRICING)` keep every existing
  caller and test working unchanged; `DEFAULT_PRICING` (the old constants) is the
  in-code fallback. The legacy `LENGTHS/DETAILS/ADDONS/EXTRA_MINUTE_PRICE/
  MAX_EXTRA_MINUTES` exports stay as views onto it.
- **Fallback over hard dependency.** `getPricing()` returns `DEFAULT_PRICING` when
  the global is unseeded/empty or the read throws — a DB hiccup must never break
  the homepage or, critically, the checkout charge. It also falls back when
  `lengths` or `details` is empty (the configurator resolves the selected
  tier/level out of them; `addOns` may legitimately be empty).
- **`unstable_cache`, not `'use cache'`.** Next 16.2.6 ships both, but `'use cache'`
  needs the `cacheComponents`/`useCache` config flag (not enabled here).
  `unstable_cache(readPricing, ["pricing-global"], { tags: ["pricing"] })` + the
  global's `afterChange` → `revalidateTag("pricing")` gives DB-free reads that
  refresh on a studio save without a deploy.
- **read public / update admin.** Both the client configurator and the server
  checkout need to read; only Payload `admins` (via the shared `adminOnly`) may
  write money. `revalidateTag` is dynamically imported inside `afterChange` so
  `next/cache` stays out of the Payload CLI graph (migrate / generate:types load
  the config outside a request).
- **Authoritative price stays server-side.** The request body still carries
  selections only; the charge is recomputed from the resolved pricing. A renamed
  default-selection id degrades (configurator first-option fallback; checkout
  400) rather than mischarging — so `id`s are documented as stable/do-not-rename.

## Consequences / pending

- Adds the repo's first Payload Global → a new `pricing` table. `generate:types`
  + `migrate:create` must run in an env with a DB (not available in the build
  sandbox), then `payload migrate` against prod. Tracked in
  `[[payload-pricing-panel]]`.
- Past orders are unaffected — `Orders.amountTotalCents` is stored history, never
  recomputed.

## Sources

- `fairy-tale-mind/specs/2026-06-23-payload-pricing-panel-design.md`
- `fairy-tale-mind/plans/2026-06-23-payload-pricing-panel.md`
