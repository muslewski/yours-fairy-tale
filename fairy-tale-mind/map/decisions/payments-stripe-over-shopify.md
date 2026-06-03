---
type: decision
summary: "Stay on Stripe for payments — not Shopify. Both let a Polish individual onboard with PESEL (no company), so the choice is decided on merits, and Stripe is the least-effort path."
tags: [checkout]
status: active
created: 2026-06-03
updated: 2026-06-03
related: ["[[checkout]]", "[[checkout-is-a-simulation]]", "[[configurator]]"]
sources:
  - "https://help.shopify.com/en/manual/payments/shopify-payments/supported-countries/poland/requirements"
  - "https://help.shopify.com/en/manual/payments/shopify-payments/onboarding/eligibility"
  - "https://stripe.com/global"
decided: 2026-06-03
supersededBy: ""
---

## Context
We considered pivoting the (still-simulated) checkout from Stripe to **Shopify
checkout**, keeping the Next.js site but letting Shopify handle commerce. The pivot
was driven by a belief that **Stripe requires a NIP + a registered company**, while
**Shopify could take payments with just a PESEL** (i.e. selling under *działalność
nierejestrowana* — unregistered activity — with no company). Target market: the **US**.

## Decision
**Stay on Stripe.** When real payments are wired, evolve the existing mock
(`components/checkout`) into a live Stripe integration. Onboard the merchant as a
Polish **Individual** account type (verified by personal government ID / PESEL — no
company, NIP, or REGON). Buyers are in the US; payouts land in the Polish bank account.

## Why
- **The PESEL premise does not favor Shopify — both providers offer it.** Shopify's
  own requirements page lists an **Individual** business type explicitly for people who
  "haven't registered with any government agency" or run a *jednoosobowa działalność
  gospodarcza*; it needs only name, DOB, contact, a Polish residential address, and a
  government photo ID — **no REGON/NIP**. **Stripe Poland has the identical
  Individual/sole-proprietor path.** So the "no company" requirement is satisfiable on
  either side; it is not a deciding factor.
- **Selling to the US does not change merchant onboarding.** Eligibility is based on the
  merchant's country (Poland → Individual type). Both Stripe and Shopify Payments let a
  merchant, once onboarded in their own country, sell to customers worldwide; payouts go
  to a Polish bank account.
- **On merits, Stripe is the least-effort, lowest-cost path.** The checkout is *already*
  a Stripe-shaped simulation (see [[checkout-is-a-simulation]]), so mock→real is the
  smallest change. No monthly platform fee, and we keep full brand control of the
  checkout UI. Shopify would add a ~$30+/mo platform fee plus a second checkout surface
  to brand-match — its main payoff, physical
  order/inventory/**fulfillment** tooling, **barely applies to a digital video**
  ([[product]]) — the product ships no physical goods, so the thing Shopify is best at
  is largely moot. That *strengthens* the Stripe choice.

## Consequences
- The path to real payments remains "wire `components/checkout` to Stripe," consistent
  with [[checkout-is-a-simulation]]. No new platform dependency is introduced.
- **Revisit Shopify only** if a *physical* product line (e.g. printed keepsakes) is later
  added and its fulfillment/inventory tooling becomes worth the monthly fee and the second
  checkout surface. That would supersede this record.
- **Open items handled outside engineering** (flagged, not blockers):
  - The *działalność nierejestrowana* revenue cap (2026: ~10,813 PLN/quarter) is a
    Polish **legal** limit that applies regardless of payment processor; selling to the
    US does not exempt it.
  - Invoicing/VAT on US sales under unregistered activity is an **accountant** question,
    independent of the Stripe-vs-Shopify choice.
  - Confirm Stripe's Individual onboarding accepts the PESEL in practice by starting
    onboarding (free) before building the real flow.
