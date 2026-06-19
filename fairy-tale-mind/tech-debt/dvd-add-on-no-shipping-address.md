---
type: debt
summary: "The 'Physical DVD' add-on is a mailed physical good, but the Stripe Checkout session collects no shipping address — there's no way to know where to send the disc."
tags: [checkout, stripe, fulfillment, configurator]
status: open
created: 2026-06-19
updated: 2026-06-19
related: ["[[configurator]]", "[[checkout]]"]
sources: []
severity: high
effort: medium
---

## Problem
As of 2026-06-19 the `master` add-on is a **Physical DVD** ($25) mailed to the buyer
(`lib/pricing.ts`). But `buildCheckoutSessionParams` (`lib/checkout.ts`) creates the Checkout
Session with no `shipping_address_collection`, so when a buyer adds the DVD there is no
mailing address captured anywhere — the order can't be fulfilled. The webhook stores `addOns`
(incl. `master`) on the order but no address. Chosen intentionally for now (copy/price change
only); flagged so it isn't forgotten.

## Fix
When the DVD add-on is selected, set `shipping_address_collection` on the session (the route
already knows `addOns`, so it can add it conditionally — e.g. `{ allowed_countries: [...] }`).
Then persist the session's `shipping_details`/`customer_details.address` onto the order in the
webhook (`app/api/stripe/webhook/route.ts`) and surface it in the studio so staff can mail the
disc. Consider whether a flat shipping fee / country restrictions are needed. Until then, do
not advertise the DVD as guaranteed-shippable.
