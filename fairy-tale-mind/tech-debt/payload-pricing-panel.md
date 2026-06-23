---
type: debt
summary: "Pricing is hardcoded in lib/pricing.ts; admins want all pricing (tiers, extra-minute, detail multipliers, add-ons) editable from a Payload Global without a deploy."
tags: [payload, pricing, checkout]
status: open
created: 2026-06-23
updated: 2026-06-23
related: ["[[checkout]]"]
sources: ["fairy-tale-mind/specs/2026-06-23-payload-pricing-panel-design.md"]
severity: medium
effort: medium
---

## Problem
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
