# Pricing Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reprice the configurator — new tier base prices, $55 extra-minute, flat detail multipliers, cheaper digital add-ons — by editing the single source of truth and its unit tests.

**Architecture:** Pure-data change in `lib/pricing.ts`. The configurator UI and the Stripe checkout route both import from this module and need no edits (UI is multiplier-driven and self-corrects to ×1.0). Tests that assert concrete totals are updated to the new arithmetic; all validation/throw tests are unchanged.

**Tech Stack:** TypeScript, vitest, Next.js 16, PayloadCMS v3, Stripe.

**Spec:** `fairy-tale-mind/specs/2026-06-23-pricing-update-design.md`

## Global Constraints

- `lib/pricing.ts` stays the SINGLE SOURCE OF TRUTH; shown price == charged price.
- All prices whole US dollars; totals stay whole-dollar integers → clean `× 100` cents.
- No UI/math/type/checkout-flow changes — values only.
- Detail multipliers all ×1.0 (detail level has no price effect, by design).

---

### Task 1: Reprice `lib/pricing.ts` and update unit tests

**Files:**
- Modify: `lib/pricing.ts:36-55` (LENGTHS prices, DETAILS multipliers, ADDONS prices, EXTRA_MINUTE_PRICE)
- Test: `tests/lib/pricing.test.ts` (concrete-total assertions + comments)

**Interfaces:**
- Consumes: nothing new.
- Produces: unchanged exports — `computeTotalCents(sel)`, `summarizeSelections(sel)`, `LENGTHS`, `DETAILS`, `ADDONS`, `EXTRA_MINUTE_PRICE`, `MAX_EXTRA_MINUTES`. Only their *values* change.

- [ ] **Step 1: Update the failing tests first (TDD red)**

In `tests/lib/pricing.test.ts`:

Test "medium + 0 extra + basic + narration" (replace body + comment):
```ts
    // subtotal = 290 (medium) + 0 (extra) + 10 (narration) = 300
    // surcharge = round(300 * (1 - 1)) = 0
    // total = 300 dollars => 30000 cents
    const sel: OrderSelections = {
      length: "medium",
      detail: "basic",
      extraMinutes: 0,
      addOns: ["narration"],
    };
    expect(computeTotalCents(sel)).toBe(30000);
```

Test "short + 0 extra + basic + no add-ons is the bare base price":
```ts
    // 180 dollars => 18000 cents
    expect(
      computeTotalCents({ length: "short", detail: "basic", extraMinutes: 0, addOns: [] }),
    ).toBe(18000);
```

Test "applies the detail multiplier to the full subtotal, rounded" → rename to
`"detail level no longer adds a surcharge (flat multipliers)"` and replace:
```ts
  test("detail level no longer adds a surcharge (flat multipliers)", () => {
    // long (580) + 5 extra * 55 (275) + narration (10) + music (10) + master (25) = 900
    // all multipliers are 1.0 => surcharge = 0
    // total = 900 dollars => 90000 cents
    const sel: OrderSelections = {
      length: "long",
      detail: "premium",
      extraMinutes: 5,
      addOns: ["narration", "music", "master"],
    };
    expect(computeTotalCents(sel)).toBe(90000);
  });
```

Test "detailed multiplier rounds the surcharge to whole dollars" → replace with
a test that pins the flat-multiplier behavior:
```ts
  test("detailed and premium cost the same as basic while multipliers are flat", () => {
    const base = { length: "medium", extraMinutes: 0, addOns: [] } as const;
    // medium = 290 dollars => 29000 cents, regardless of detail level
    expect(computeTotalCents({ ...base, detail: "basic" })).toBe(29000);
    expect(computeTotalCents({ ...base, detail: "detailed" })).toBe(29000);
    expect(computeTotalCents({ ...base, detail: "premium" })).toBe(29000);
  });
```

Leave every throw/validation test and both `summarizeSelections` tests unchanged.

- [ ] **Step 2: Run tests to verify they fail (red)**

Run: `npm run test -- tests/lib/pricing.test.ts`
Expected: FAIL — the four total assertions mismatch (old constants still in `lib/pricing.ts`).

- [ ] **Step 3: Apply the value changes in `lib/pricing.ts`**

LENGTHS (lines ~36-40):
```ts
export const LENGTHS: LengthTier[] = [
  { id: "short", label: "Short", minutes: 3, price: 180, note: "A short and sweet first story." },
  { id: "medium", label: "Medium", minutes: 5, price: 290, note: "Room for a fuller adventure." },
  { id: "long", label: "Long", minutes: 10, price: 580, note: "The full journey, start to finish." },
];
```

DETAILS multipliers (lines ~42-46) — set detailed and premium to 1:
```ts
export const DETAILS: DetailLevel[] = [
  { id: "basic", label: "Basic", multiplier: 1, note: "Clean, charming animation with all the essentials." },
  { id: "detailed", label: "Detailed", multiplier: 1, note: "Richer backgrounds and more movement in every scene." },
  { id: "premium", label: "Premium", multiplier: 1, note: "Our finest work, with lush detail in every frame." },
];
```

ADDONS narration + music to 10 (lines ~48-52; leave master at 25):
```ts
export const ADDONS: AddOn[] = [
  { id: "narration", label: "Custom narration", price: 10, note: "A warm voice reads the story aloud." },
  { id: "music", label: "Original music", price: 10, note: "A score written to match their adventure." },
  { id: "master", label: "Physical DVD", price: 25, note: "Their film on a real DVD, mailed to you to keep and watch again and again." },
];
```

EXTRA_MINUTE_PRICE (line ~55):
```ts
export const EXTRA_MINUTE_PRICE = 55;
```

- [ ] **Step 4: Run the pricing tests to verify green**

Run: `npm run test -- tests/lib/pricing.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Run the full unit suite to catch any other total assertions**

Run: `npm run test`
Expected: PASS. If `tests/stripe/checkout.test.ts` or `tests/lib/delivery.test.ts`
assert a concrete dollar total, recompute it from the new constants and update —
then re-run. (These import the same source of truth.)

- [ ] **Step 6: Commit (feature branch — app code)**

```bash
git add lib/pricing.ts tests/
git commit -m "feat(pricing): reprice tiers, flat detail, \$55 extra-minute, cheaper add-ons"
```

## Self-Review

- **Spec coverage:** base prices (Step 3 LENGTHS), extra-minute $55 (Step 3),
  flat multipliers (Step 3 DETAILS), add-on $10/$10, DVD kept $25 (Step 3),
  test totals (Step 1), no-UI-change rationale (architecture). All covered.
- **Placeholder scan:** none — all code shown verbatim.
- **Type consistency:** only values change; exported types/signatures untouched,
  so configurator/checkout importers compile unchanged.
- **Watch:** Step 5 guards against another test file asserting an old total.
