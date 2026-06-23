# Payload Pricing Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all configurator pricing out of `lib/pricing.ts` constants into an admin-editable Payload Global (`pricing`), read server-side via a cached resolver, with the constants kept as a fallback default so nothing breaks if the global is unseeded.

**Architecture:** `lib/pricing.ts` keeps the math but its functions take a `Pricing` arg defaulted to `DEFAULT_PRICING` (zero churn for existing callers). A new `globals/Pricing.ts` Global is the editable data. A new server-only `lib/pricing-source.ts` `getPricing()` reads the global (cached, tag `"pricing"`, falls back to defaults). The homepage server component and the Stripe checkout route both call `getPricing()` and thread the result into the configurator (props) and the charge math (authoritative).

**Tech Stack:** Next.js 16 (App Router, React 19), PayloadCMS v3 (postgresAdapter), Tailwind v4, vitest.

**Spec:** `fairy-tale-mind/specs/2026-06-23-payload-pricing-panel-design.md`

## Global Constraints

- **This is NOT the Next.js you know** (AGENTS.md). Before writing the caching code in Task 3, READ `node_modules/next/dist/docs/` for the current caching primitive — Next 16 may favor `'use cache'` + `cacheTag`/`cacheLife` over `unstable_cache`. Use whatever the vendored docs say is current; the plan's `unstable_cache` is the intent, not a mandate.
- `lib/pricing.ts` stays the single math home; shown price === charged price (`computeTotalCents`).
- Existing public exports `LENGTHS/DETAILS/ADDONS/EXTRA_MINUTE_PRICE/MAX_EXTRA_MINUTES` MUST remain exported (other modules import them) — they become views onto `DEFAULT_PRICING`.
- Global `update` access = Payload admins ONLY; `read` = public. Confirm the admin collection slug from `collections/Admins.ts` (expected `"admins"`).
- `getPricing()` is server-only — never import it (or `getPayloadClient`) into a `"use client"` module.
- Orders' stored `amountTotalCents` is history — do not touch it; repricing must not recompute past orders.
- Do NOT auto-run the production migration. Generate + commit it; applying to prod is the human end-gate step.
- Brand voice on any admin-facing field labels/descriptions (calm, plain). Use the `brand-voice` skill if adding customer-visible copy (none expected here).

---

### Task 1: Refactor `lib/pricing.ts` to a defaulted `Pricing` param

**Files:**
- Modify: `lib/pricing.ts`
- Test: `tests/lib/pricing.test.ts` (ADD cases; existing cases must still pass unchanged)

**Interfaces:**
- Produces:
  - `export type Pricing = { lengths: LengthTier[]; details: DetailLevel[]; addOns: AddOn[]; extraMinutePrice: number; maxExtraMinutes: number }`
  - `export const DEFAULT_PRICING: Pricing` (built from the current constant values)
  - `export const LENGTHS`, `DETAILS`, `ADDONS`, `EXTRA_MINUTE_PRICE`, `MAX_EXTRA_MINUTES` — unchanged identifiers, now sourced from `DEFAULT_PRICING` (e.g. `export const LENGTHS = DEFAULT_PRICING.lengths`).
  - `computeTotalCents(sel: OrderSelections, pricing?: Pricing): number` — defaults to `DEFAULT_PRICING`.
  - `summarizeSelections(sel: OrderSelections, pricing?: Pricing): string` — defaults to `DEFAULT_PRICING`.
  - `resolve(sel, pricing)` internal — now reads tiers/levels/add-ons from `pricing`, not module constants.

- [ ] **Step 1: Add failing tests for the custom-pricing path**

Append to `tests/lib/pricing.test.ts`:

```ts
import { DEFAULT_PRICING, type Pricing } from "@/lib/pricing";

describe("computeTotalCents with injected pricing", () => {
  const altPricing: Pricing = {
    ...DEFAULT_PRICING,
    lengths: [{ id: "short", label: "Short", minutes: 3, price: 200, note: "" }],
    extraMinutePrice: 99,
    addOns: [{ id: "narration", label: "Custom narration", price: 33, note: "" }],
  };

  test("uses the injected pricing, not the defaults", () => {
    // 200 + 2*99 (198) + narration 33 = 431 dollars => 43100 cents
    expect(
      computeTotalCents(
        { length: "short", detail: "basic", extraMinutes: 2, addOns: ["narration"] },
        altPricing,
      ),
    ).toBe(43100);
  });

  test("omitting pricing falls back to DEFAULT_PRICING (current live numbers)", () => {
    // short 180 bare => 18000 cents
    expect(
      computeTotalCents({ length: "short", detail: "basic", extraMinutes: 0, addOns: [] }),
    ).toBe(18000);
  });

  test("a length absent from injected pricing throws", () => {
    expect(() =>
      computeTotalCents(
        { length: "long", detail: "basic", extraMinutes: 0, addOns: [] },
        altPricing,
      ),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run — verify the new cases fail to compile/pass**

Run: `npm run test -- tests/lib/pricing.test.ts`
Expected: FAIL — `Pricing`/`DEFAULT_PRICING` not exported yet, signature doesn't accept a 2nd arg.

- [ ] **Step 3: Implement the refactor in `lib/pricing.ts`**

- Keep the three `type` declarations (`LengthTier`, `DetailLevel`, `AddOn`, `OrderSelections`).
- Add the `Pricing` type.
- Define `DEFAULT_PRICING` holding the CURRENT live values verbatim (short 180 / medium 290 / long 580; details all multiplier 1; addOns narration 10 / music 10 / master 25; `extraMinutePrice: 55`; `maxExtraMinutes: 30`).
- Re-export the legacy names as views: `export const LENGTHS = DEFAULT_PRICING.lengths;` etc. (so `EXTRA_MINUTE_PRICE = DEFAULT_PRICING.extraMinutePrice`, `MAX_EXTRA_MINUTES = DEFAULT_PRICING.maxExtraMinutes`).
- Change `resolve(sel)` → `resolve(sel, pricing)` reading `pricing.lengths/details/addOns/maxExtraMinutes`.
- `computeTotalCents(sel, pricing = DEFAULT_PRICING)` and `summarizeSelections(sel, pricing = DEFAULT_PRICING)` pass `pricing` to `resolve` and use `pricing.extraMinutePrice`.

- [ ] **Step 4: Run — pricing suite green (old + new)**

Run: `npm run test -- tests/lib/pricing.test.ts tests/stripe/checkout.test.ts`
Expected: PASS — existing single-arg calls still resolve via the default; new injected-pricing cases pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing.ts tests/lib/pricing.test.ts
git commit -m "refactor(pricing): take a Pricing arg (defaulted to DEFAULT_PRICING)"
```

---

### Task 2: The `pricing` Payload Global + registration + types + migration

**Files:**
- Create: `globals/Pricing.ts`
- Modify: `payload.config.ts` (add `globals: [Pricing]`, import it)
- Generated: `payload-types.ts` (via `npm run generate:types`)
- Generated: `migrations/*` (via `npm run migrate:create`)

**Interfaces:**
- Produces: a Payload Global slug `"pricing"` whose shape maps 1:1 to `Pricing` (arrays `lengths`/`details`/`addOns` with the same subfields; numbers `extraMinutePrice`, `maxExtraMinutes`). Read by `getPricing()` in Task 3.

- [ ] **Step 1: Confirm the admin collection slug**

Read `collections/Admins.ts`; note its `slug` (expected `"admins"`). Use it in the access check below.

- [ ] **Step 2: Write `globals/Pricing.ts`**

```ts
import type { GlobalConfig } from "payload";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { revalidateTag } from "next/cache";

// Only Payload admins may change money; everyone may read (configurator + checkout).
const adminsOnly = ({ req }: { req: { user?: { collection?: string } | null } }) =>
  req.user?.collection === "admins";

export const Pricing: GlobalConfig = {
  slug: "pricing",
  label: "Pricing",
  access: {
    read: () => true,
    update: adminsOnly,
  },
  admin: {
    description: "Base prices for the video configurator. Edits go live without a deploy.",
  },
  hooks: {
    afterChange: [() => { revalidateTag("pricing"); }],
  },
  fields: [
    {
      name: "lengths",
      type: "array",
      label: "Length tiers",
      defaultValue: DEFAULT_PRICING.lengths,
      fields: [
        { name: "id", type: "text", required: true, admin: { description: "Stable key (short/medium/long) — do not rename; historical orders reference it." } },
        { name: "label", type: "text", required: true },
        { name: "minutes", type: "number", required: true, min: 1 },
        { name: "price", type: "number", required: true, min: 0, admin: { description: "Base price in whole US dollars." } },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "details",
      type: "array",
      label: "Detail levels",
      defaultValue: DEFAULT_PRICING.details,
      fields: [
        { name: "id", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "multiplier", type: "number", required: true, min: 0, admin: { description: "Surcharge multiplier on the subtotal (1 = no surcharge)." } },
        { name: "note", type: "text" },
      ],
    },
    {
      name: "addOns",
      type: "array",
      label: "Add-ons",
      defaultValue: DEFAULT_PRICING.addOns,
      fields: [
        { name: "id", type: "text", required: true },
        { name: "label", type: "text", required: true },
        { name: "price", type: "number", required: true, min: 0, admin: { description: "Price in whole US dollars." } },
        { name: "note", type: "text" },
      ],
    },
    { name: "extraMinutePrice", type: "number", required: true, min: 0, defaultValue: DEFAULT_PRICING.extraMinutePrice, admin: { description: "US dollars per extra minute." } },
    { name: "maxExtraMinutes", type: "number", required: true, min: 0, defaultValue: DEFAULT_PRICING.maxExtraMinutes },
  ],
};
```

(If `revalidateTag` cannot be imported in the Payload config context, move the
`afterChange` body to call the same revalidation primitive chosen in Task 3 —
keep the tag string `"pricing"` identical.)

- [ ] **Step 3: Register in `payload.config.ts`**

Import `Pricing` and add `globals: [Pricing],` to `buildConfig({...})` (alongside `collections`).

- [ ] **Step 4: Generate types**

Run: `npm run generate:types`
Expected: `payload-types.ts` now includes a `Pricing` global interface. (First run also creates the file.)

- [ ] **Step 5: Generate the migration**

Run: `npm run migrate:create`
Expected: a new file under `migrations/` creating the `pricing` table. DO NOT apply to prod. (Locally, dev `push` syncs schema; the committed migration is for prod, applied by a human at the end gate.)

- [ ] **Step 6: Commit**

```bash
git add globals/Pricing.ts payload.config.ts payload-types.ts migrations/
git commit -m "feat(pricing): add admin-editable pricing Global + migration"
```

---

### Task 3: `getPricing()` server resolver (cached, fallback)

**Files:**
- Create: `lib/pricing-source.ts`
- Test: `tests/lib/pricing-source.test.ts`

**Interfaces:**
- Consumes: `getPayloadClient` (`lib/payload.ts`), `DEFAULT_PRICING` + `Pricing` (`lib/pricing.ts`).
- Produces: `export function getPricing(): Promise<Pricing>` — server-only; returns the global mapped to `Pricing`, or `DEFAULT_PRICING` on empty/error.

- [ ] **Step 1: Read the Next 16 caching docs**

Read `node_modules/next/dist/docs/` for the current cache primitive (`'use cache'` + `cacheTag`, or `unstable_cache`). Implement Step 3 with whatever is current; keep the tag literal `"pricing"`.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/payload", () => ({
  getPayloadClient: vi.fn(),
}));

import { getPayloadClient } from "@/lib/payload";
import { DEFAULT_PRICING } from "@/lib/pricing";
import { getPricing } from "@/lib/pricing-source";

test("falls back to DEFAULT_PRICING when the global read throws", async () => {
  (getPayloadClient as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("db down"));
  await expect(getPricing()).resolves.toEqual(DEFAULT_PRICING);
});

test("maps a populated global to Pricing", async () => {
  const fakeGlobal = { ...DEFAULT_PRICING, extraMinutePrice: 77 };
  (getPayloadClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    findGlobal: vi.fn().mockResolvedValue(fakeGlobal),
  });
  const p = await getPricing();
  expect(p.extraMinutePrice).toBe(77);
});
```

(If the caching wrapper makes the result memoize across tests, expose an
uncached `readPricing()` for the unit test and wrap it for the export, OR
`vi.resetModules()` between cases. Keep the public surface `getPricing`.)

- [ ] **Step 3: Implement `lib/pricing-source.ts`**

```ts
import "server-only";
import { getPayloadClient } from "@/lib/payload";
import { DEFAULT_PRICING, type Pricing } from "@/lib/pricing";

async function readPricing(): Promise<Pricing> {
  try {
    const payload = await getPayloadClient();
    const g = await payload.findGlobal({ slug: "pricing" });
    if (!g || !Array.isArray(g.lengths) || g.lengths.length === 0) return DEFAULT_PRICING;
    return {
      lengths: g.lengths.map((l) => ({ id: l.id, label: l.label, minutes: l.minutes, price: l.price, note: l.note ?? "" })),
      details: g.details.map((d) => ({ id: d.id, label: d.label, multiplier: d.multiplier, note: d.note ?? "" })),
      addOns: g.addOns.map((a) => ({ id: a.id, label: a.label, price: a.price, note: a.note ?? "" })),
      extraMinutePrice: g.extraMinutePrice,
      maxExtraMinutes: g.maxExtraMinutes,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

// Wrap with the Next 16 cache primitive chosen in Step 1, tag "pricing".
export const getPricing = /* cache(readPricing, ["pricing"], { tags: ["pricing"] }) */ readPricing;
```

Replace the commented wrap with the real current-API cache call; do not ship the bare `readPricing` if a cache primitive is available.

- [ ] **Step 4: Run — green**

Run: `npm run test -- tests/lib/pricing-source.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pricing-source.ts tests/lib/pricing-source.test.ts
git commit -m "feat(pricing): getPricing() resolver — cached global read with default fallback"
```

---

### Task 4: Thread pricing into the authoritative checkout

**Files:**
- Modify: `lib/checkout.ts` (`buildCheckoutSessionParams`)
- Modify: `app/api/stripe/checkout/route.ts`
- Test: `tests/stripe/checkout.test.ts`, `tests/lib/checkout.test.ts`

**Interfaces:**
- Consumes: `getPricing` (Task 3), `Pricing` (Task 1).
- Produces: `buildCheckoutSessionParams(selections, pricing?: Pricing)` — defaulted to `DEFAULT_PRICING` so existing tests pass; the route passes the resolved global.

- [ ] **Step 1: Add a test that injected pricing changes the charge**

In `tests/stripe/checkout.test.ts`, add:

```ts
import { DEFAULT_PRICING } from "@/lib/pricing";

test("charge uses injected pricing when provided", () => {
  const pricing = { ...DEFAULT_PRICING, lengths: DEFAULT_PRICING.lengths.map((l) => l.id === "short" ? { ...l, price: 500 } : l) };
  const p = buildCheckoutSessionParams(
    { childName: "", world: "bedtime", length: "short", detail: "basic", extraMinutes: 0, addOns: [] },
    pricing,
  );
  expect(p.line_items?.[0]?.price_data?.unit_amount).toBe(50000);
});
```

- [ ] **Step 2: Run — fail**

Run: `npm run test -- tests/stripe/checkout.test.ts`
Expected: FAIL — builder ignores the 2nd arg.

- [ ] **Step 3: Implement**

- `lib/checkout.ts`: `buildCheckoutSessionParams(selections, pricing: Pricing = DEFAULT_PRICING)`; pass `pricing` into `computeTotalCents(selections, pricing)` and `summarizeSelections(selections, pricing)`.
- `app/api/stripe/checkout/route.ts`: `const pricing = await getPricing();` then `buildCheckoutSessionParams(selections, pricing)`. Keep all existing validation/400 behavior — `computeTotalCents` still throws on invalid selections.

- [ ] **Step 4: Run — green**

Run: `npm run test -- tests/stripe/checkout.test.ts tests/lib/checkout.test.ts`
Expected: PASS (existing single-arg builder tests still pass via default).

- [ ] **Step 5: Commit**

```bash
git add lib/checkout.ts app/api/stripe/checkout/route.ts tests/
git commit -m "feat(pricing): charge from the resolved pricing global (authoritative)"
```

---

### Task 5: Thread pricing into the configurator (display)

**Files:**
- Modify: `app/(site)/page.tsx` (server component — fetch + pass prop)
- Modify: `components/home/configurator/index.tsx` (accept `pricing` prop; stop importing value constants)
- Modify: `components/home/configurator/step-film.tsx`, `range-slider.tsx`, `price-rail.tsx` (receive values via props/already-threaded state)
- Test: existing component/e2e tests must still pass; no new unit test required (display layer) — verify via build + the e2e checkout spec if present.

**Interfaces:**
- Consumes: `getPricing` (Task 3), `Pricing` (Task 1).
- Produces: `Configurator` accepts `{ pricing: Pricing }` and derives all `LENGTHS/DETAILS/ADDONS/EXTRA_MINUTE_PRICE/MAX_EXTRA_MINUTES` usages from it.

- [ ] **Step 1: Fetch in the page**

In `app/(site)/page.tsx`: `const pricing = await getPricing();` and render `<Configurator pricing={pricing} />`. (Page is already a server component.)

- [ ] **Step 2: Accept the prop in `index.tsx`**

- Add `pricing: Pricing` to the component props.
- Replace the direct imports of `LENGTHS/DETAILS/ADDONS/EXTRA_MINUTE_PRICE` with `const { lengths, details, addOns, extraMinutePrice, maxExtraMinutes } = pricing;`.
- Keep importing `summarizeSelections` and the `type` imports from `@/lib/pricing` (types are fine in client code).
- Pass the needed slices down: `step-film` gets `addOns` + `maxExtraMinutes`; `range-slider` gets `extraMinutePrice`; `price-rail` already takes typed props — feed it from `pricing`-derived values.

- [ ] **Step 3: Update the leaf components**

- `step-film.tsx`: replace `import { ADDONS, MAX_EXTRA_MINUTES }` usages with props (`addOns`, `maxExtraMinutes`).
- `range-slider.tsx`: replace `import { EXTRA_MINUTE_PRICE }` with an `extraMinutePrice` prop.
- `price-rail.tsx`: keep type imports; ensure all numbers come from props (no value import).
- Grep to confirm zero value-imports remain: `rg "from \"@/lib/pricing\"" components/home/configurator/` should show only `type`-qualified imports.

- [ ] **Step 4: Build + typecheck + tests**

Run: `npm run test`
Run: `npm run build`
Expected: tests pass; build succeeds (server component fetch compiles; no client module imports `getPricing`/`getPayloadClient`).

- [ ] **Step 5: Commit**

```bash
git add app/(site)/page.tsx components/home/configurator/
git commit -m "feat(pricing): drive the configurator display from the pricing global"
```

---

### Task 6: Whole-feature verification

- [ ] **Step 1: Full unit suite**

Run: `npm run test`
Expected: all runnable tests pass (the pre-existing PAYLOAD_SECRET-gated files still need env — note, don't fix here).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Manual smoke (local, dev `push` syncs the global table)**

- Start dev, open the studio → "Pricing" appears, pre-filled with live values.
- Edit `extraMinutePrice` → save → configurator reflects it (after `revalidateTag`).
- Confirm a non-admin (customer) cannot update the global (access denied).
- Confirm checkout charge equals the edited value.

- [ ] **Step 4: No commit (verification only).**

## Self-Review

- **Spec coverage:** defaulted-param refactor (T1), Global + access + afterChange revalidate + migration + types (T2), cached resolver with fallback (T3), authoritative checkout wiring (T4), configurator display wiring (T5), verification incl. admin-only + fallback (T6). All spec sections covered.
- **Placeholder scan:** the only intentional "fill-in" is the cache-primitive choice (T3 Step 1/3) and the admin slug (T2 Step 1) — both are "verify against the repo/docs" steps with the exact intent and tag/string given, not vague TODOs.
- **Type consistency:** `Pricing`, `DEFAULT_PRICING`, `getPricing`, `buildCheckoutSessionParams(sel, pricing?)`, `computeTotalCents(sel, pricing?)` used identically across tasks. Legacy `LENGTHS/...` exports preserved so no unrelated importer breaks.
- **Risk:** production migration is generated + committed in T2 but explicitly NOT applied — surfaced again at the end gate.
