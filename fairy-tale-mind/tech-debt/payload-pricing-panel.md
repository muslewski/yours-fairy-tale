---
type: debt
summary: "Pricing Global is built (code on feat/payload-pricing-panel). Remaining: run generate:types + migrate:create in an env with a DB, then payload migrate against prod to create the `pricing` table."
tags: [payload, pricing, checkout, migration]
status: open
created: 2026-06-23
updated: 2026-06-23
related: ["[[checkout]]", "[[configurator]]", "[[payload-backend]]", "[[2026-06-23-pricing-in-payload-global]]", "[[no-production-db-migrations]]"]
sources: ["fairy-tale-mind/specs/2026-06-23-payload-pricing-panel-design.md", "fairy-tale-mind/plans/2026-06-23-payload-pricing-panel.md"]
severity: medium
effort: low
---

## Remaining (2026-06-23) — type-gen + migration

The code shipped (Global, getPricing() resolver, configurator + checkout wiring,
review fix). NOT done in the build sandbox (no local DB / PAYLOAD_SECRET):

1. `npm run generate:types` — adds the `Pricing` global type to `payload-types.ts`.
2. `npm run migrate:create` — generates the `pricing`-table migration; commit it.
3. `payload migrate` against prod (the gated human step — see
   `[[no-production-db-migrations]]`).
4. Local studio smoke: panel pre-filled, edit propagates to the configurator,
   non-admin cannot update, checkout charges the edited value.

Until the migration runs, prod has no `pricing` table → `getPricing()` falls back
to `DEFAULT_PRICING` (current live values), so the site is correct but not yet
editable.

## Original problem
All configurator/checkout pricing lives in `lib/pricing.ts` constants. Every
price change (like the 2026-06-23 reprice) needs a code edit + deploy. The
business wants to edit tier base prices, the extra-minute price, detail-level
multipliers, and add-on prices from the Payload studio.

## Fix
Build the Payload `pricing` Global per
`fairy-tale-mind/specs/2026-06-23-payload-pricing-panel-design.md`:
- Global with `lengths[] / details[] / addOns[] / extraMinutePrice / maxExtraMinutes`.
- read: public, update: admin-only.
- Refactor `lib/pricing.ts` math to pure `(sel, pricing)` functions; keep
  constants as fallback defaults.
- Checkout reads the global server-side (authoritative); page server-component
  passes resolved pricing to the client configurator; cache + revalidate on edit.
- Seed with the post-2026-06-23 values.

## Watch-items
Authoritative price must recompute server-side (never trust client); guard
`id` drift against historical orders; cache staleness must not affect the
charged amount; repricing must not retroactively alter past orders.
