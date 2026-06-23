---
type: debt
summary: "Pricing Global shipped to main + migration created and build-verified. Remaining: prod deploy (instrumentation auto-runs payload migrate) and an optional one-time studio seed."
tags: [payload, pricing, checkout, migration]
status: resolved
created: 2026-06-23
updated: 2026-06-23
related: ["[[checkout]]", "[[configurator]]", "[[payload-backend]]", "[[2026-06-23-pricing-in-payload-global]]", "[[no-production-db-migrations]]", "[[migrate-on-deploy-via-instrumentation]]"]
sources: ["fairy-tale-mind/specs/2026-06-23-payload-pricing-panel-design.md", "fairy-tale-mind/plans/2026-06-23-payload-pricing-panel.md"]
severity: medium
effort: low
---

## Resolved 2026-06-23

Done and on `main`:

- Global + `getPricing()` resolver + configurator/checkout wiring + review fix.
- **Migration** `migrations/20260623_000000_pricing_global.ts` (pricing +
  pricing_lengths/details/add_ons) — hand-authored idempotent delta matching the
  repo convention, introspected from a real dev `push` (pg_dump), verified to
  apply cleanly AND idempotently on a pricing-less DB.
- **Full `npm run build` passes** (caught + fixed a Next-16 `revalidateTag(tag,
  profile)` arity change).
- End-to-end smoke: unseeded → fallback; after a studio edit `getPricing()`
  returns the new values and the authoritative charge reflects them.

The standalone `payload` CLI (`migrate:create`/`generate:types`) can't load this
config's module graph under node 22 (tsx scoped loader fails on extensionless
nested imports; swc hits an ESM named-export quirk). Workaround used: generate
the schema via dev `push` + introspect, hand-author the migration. `payload-
types.ts` was skipped — nothing imports `@/payload-types`; the resolver maps the
global defensively without generated types.

Remaining (not blocking, no code):

1. **Prod deploy** — `instrumentation.ts` auto-runs `payload migrate` on boot
   (`[[migrate-on-deploy-via-instrumentation]]`), creating the `pricing` table.
2. **Optional**: open the studio Pricing screen once and Save to seed the row
   (until then `getPricing()` falls back to `DEFAULT_PRICING` = current live
   values, so the storefront is already correct).

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
