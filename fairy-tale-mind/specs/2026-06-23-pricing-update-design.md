---
title: Pricing update — new tiers, flat detail, cheaper add-ons
date: 2026-06-23
status: approved
kind: spec
supersedes: 2026-06-01-video-product-switch-design.md (pricing values only)
---

# Pricing update (ship now)

Reprice the personalized-video configurator for production. Pure value change
in the single source of truth — `lib/pricing.ts` — plus the unit tests that
assert concrete totals. No UI, math, type, or checkout-flow changes.

## Why

Business decision (2026-06-23) to lower entry price, flatten the detail
surcharge to zero for now, and cut digital add-on prices. Detail-level price
differentiation and full admin control come later via the Payload pricing panel
(separate design: `2026-06-23-payload-pricing-panel-design.md`).

## The change (`lib/pricing.ts`)

**Length tiers — base price:**

| id | minutes | old | new |
|--------|---------|------|------|
| short  | 3       | $300 | **$180** |
| medium | 5       | $450 | **$290** |
| long   | 10      | $900 | **$580** |

**Extra minute:** `EXTRA_MINUTE_PRICE` $100 → **$55**. (`MAX_EXTRA_MINUTES` = 30, unchanged.)

**Detail multipliers — all flat ×1.0 (no surcharge):**

| id | old | new |
|----------|------|------|
| basic    | ×1.0 | ×1.0 |
| detailed | ×1.1 | **×1.0** |
| premium  | ×1.3 | **×1.0** |

**Add-ons:**

| id | label | old | new |
|--------|------------------|------|------|
| narration | Custom narration | $60 | **$10** |
| music     | Original music   | $40 | **$10** |
| master    | Physical DVD     | $25 | **$25** (unchanged — mailed physical good) |

Labels and `note` copy stay as-is. Detail-level `note` text is descriptive
(no price claim), so no copy edit needed.

## Why no UI changes are required

The configurator UI is data-driven off the multiplier:

- `components/home/configurator/index.tsx:95` — caption renders `"Base price"`
  when `multiplier === 1`, else `+N%`. With all three multipliers at 1.0, all
  three render `"Base price"`. Self-corrects.
- `components/home/configurator/price-rail.tsx:93` — the surcharge line item
  only renders `when surcharge > 0`. With flat multipliers, surcharge is always
  0, so the line never shows. Self-corrects.

No stale "+10%" / "+30%" strings exist in source; they were computed. Nothing to strip.

## Consequence to accept

Detail level (Basic/Detailed/Premium) has **no price effect** until the Payload
panel restores per-level multipliers. The selector still works and is still
shown; it's cosmetic on price for now. Explicitly approved.

## Tests to update (`tests/lib/pricing.test.ts`)

Recompute the concrete-total assertions; keep all the throw/validation tests
unchanged.

| test | new expectation |
|------|-----------------|
| medium + basic + narration | subtotal 290 + 0 + 10 = **300 → 30000 cents** |
| short bare base | **180 → 18000 cents** |
| long + premium + 5 extra + all 3 add-ons | 580 + 5×55(275) + 10+10+25(45) = 900; premium ×1.0 → surcharge 0 → **900 → 90000 cents** |
| (was) "detailed multiplier rounds surcharge" | repurpose → **detail level no longer changes price**: medium detailed = medium basic = **29000 cents**, surcharge 0 regardless of level |

Update the inline `//` comments to match the new arithmetic.

### Note on the rounding guard

`Math.round(subtotal * (multiplier - 1))` stays in code. With all multipliers
1.0 no test exercises non-round surcharge anymore (acceptable — the guard is
still correct and dormant). The Payload-panel work reintroduces a multiplier
test when per-level surcharges return.

## Invariants preserved

- `lib/pricing.ts` remains the single source of truth; configurator (display)
  and `app/api/stripe/checkout/route.ts` (authoritative charge) both import it,
  so shown price == charged price.
- All base prices are whole dollars; extra-minute $55 is whole dollars; totals
  stay whole-dollar integers → clean `× 100` cents for Stripe.

## Out of scope (→ separate later cycle)

Payload-backed editable pricing (the admin "Pricing" panel). Designed in
`2026-06-23-payload-pricing-panel-design.md`; not built in this change.

## Rollout

App code on a feature branch → final review → end gate → production. Per the
autopilot flow, this spec is committed to `main` immediately; only the code
edits ride the branch.
