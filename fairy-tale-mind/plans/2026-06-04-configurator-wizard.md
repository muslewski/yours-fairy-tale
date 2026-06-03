# Configurator 3-step Wizard + Sign-in CTA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `#build` configurator into a 3-step wizard (The film → The story → Photos & checkout), persist every configured field (`extraMinutes`, `addOns`, `plotNote`) onto the order, add a UI-only photo dropzone in step 3, and add a "Place an order" CTA to the sign-in page.

**Architecture:** The pricing source (`lib/pricing.ts`) and the Stripe-hosted checkout flow are unchanged. Selection state stays lifted in a wizard shell; steps swap in the left panel while the price rail stays mounted. New order fields flow client → Stripe metadata → webhook → Payload. Photos in step 3 are presentational only (the dashboard's post-purchase uploader remains the real path).

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4, Motion (`motion/react`), PayloadCMS v3, Stripe, vitest, Playwright.

**Spec:** `fairy-tale-mind/specs/2026-06-04-configurator-wizard-design.md`

---

## Task 1: Persist extraMinutes / addOns / plotNote end-to-end

**Files:**
- Modify: `lib/checkout.ts`
- Modify: `app/api/stripe/checkout/route.ts`
- Modify: `collections/Orders.ts`
- Modify: `app/api/stripe/webhook/route.ts`
- Test: `tests/stripe/checkout.test.ts` (extend)
- Test: the webhook test under `tests/stripe/` (extend — locate with `ls tests/stripe/`)

- [ ] **Step 1: Extend the checkout metadata test (RED)**

In `tests/stripe/checkout.test.ts`, in the first test ("builds a session carrying config in metadata…"), strengthen the metadata assertion and add the new fields to the input:

```ts
  const p = buildCheckoutSessionParams({
    childName: "Ada",
    world: "space",
    length: "short",
    detail: "basic",
    extraMinutes: 2,
    addOns: ["narration", "music"],
    plotNote: "A brave knight who loves cats.",
    email: "a@b.io",
  });
  expect(p.mode).toBe("payment");
  expect(p.customer_email).toBe("a@b.io");
  expect(p.metadata).toMatchObject({
    childName: "Ada",
    world: "space",
    length: "short",
    detailLevel: "basic",
    extraMinutes: "2",
    addOns: "narration,music",
    plotNote: "A brave knight who loves cats.",
  });
```

Add one focused test below it:

```ts
test("plotNote is capped to Stripe's 500-char metadata limit", () => {
  const long = "x".repeat(600);
  const p = buildCheckoutSessionParams({
    childName: "",
    world: "custom",
    length: "short",
    detail: "basic",
    extraMinutes: 0,
    addOns: [],
    plotNote: long,
  });
  expect((p.metadata?.plotNote as string).length).toBe(500);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/stripe/checkout.test.ts`
Expected: FAIL — `metadata` is missing `extraMinutes`/`addOns`/`plotNote`, and `CheckoutInput` has no `plotNote`.

- [ ] **Step 3: Add `plotNote` to `CheckoutInput` and the metadata in `lib/checkout.ts`**

In the `CheckoutInput` type, add after `addOns: string[];`:

```ts
  /** Optional free-text plot idea from the parent (capped before sending). */
  plotNote?: string;
```

Destructure it:

```ts
  const { childName, world, length, detail, extraMinutes, addOns, email, plotNote } = input;
```

Replace the `metadata` object with (Stripe metadata values must be strings; cap plotNote at 500):

```ts
    metadata: {
      childName,
      world,
      length,
      detailLevel: detail,
      extraMinutes: String(extraMinutes),
      addOns: addOns.join(","),
      plotNote: (plotNote ?? "").slice(0, 500),
    },
```

- [ ] **Step 4: Pass `plotNote` through the checkout route**

In `app/api/stripe/checkout/route.ts`, add `plotNote` to the destructure:

```ts
  const { childName, world, length, detail, extraMinutes, addOns, email, plotNote } = body;
```

And to the built `input`:

```ts
    addOns: Array.isArray(addOns) ? addOns : [],
    plotNote: typeof plotNote === "string" ? plotNote : "",
    email,
```

- [ ] **Step 5: Run the checkout test to verify it passes**

Run: `npx vitest run tests/stripe/checkout.test.ts`
Expected: PASS.

- [ ] **Step 6: Add the new fields to the Orders collection**

In `collections/Orders.ts`, insert these three fields immediately after the `detailLevel` field block (before `assets`):

```ts
    { name: "extraMinutes", type: "number", min: 0, defaultValue: 0 },
    { name: "addOns", type: "text", hasMany: true },
    {
      name: "plotNote",
      type: "textarea",
      admin: {
        description: "The parent's own plot idea from the configurator (optional).",
      },
    },
```

- [ ] **Step 7: Write the order fields in the webhook (RED for webhook test)**

First, locate and read the webhook test: `ls tests/stripe/` then open the one covering `checkout.session.completed` order creation. Add assertions that the created order carries the new fields — find the test that inspects the `payload.create({ collection: "orders", … })` call (or the resulting doc) and assert:

```ts
  expect(orderData).toMatchObject({
    extraMinutes: 3,
    addOns: ["narration", "music"],
    plotNote: "A brave knight.",
  });
```

Make sure that test's mock session `metadata` includes `extraMinutes: "3"`, `addOns: "narration,music"`, `plotNote: "A brave knight."`.

Run the webhook test → Expected: FAIL (order data lacks the new fields).

- [ ] **Step 8: Read + persist the new metadata in the webhook**

In `app/api/stripe/webhook/route.ts`, expand the metadata destructure (~line 187):

```ts
  const { childName, world, length, detailLevel, extraMinutes, addOns, plotNote } = meta;
```

In the `payload.create({ collection: "orders", data: { … } })` block, add after `detailLevel: …`:

```ts
      extraMinutes: extraMinutes ? parseInt(extraMinutes, 10) || 0 : undefined,
      addOns: addOns ? addOns.split(",").filter(Boolean) : undefined,
      plotNote: plotNote || undefined,
```

- [ ] **Step 9: Run both stripe tests to verify pass**

Run: `npx vitest run tests/stripe/`
Expected: PASS (checkout + webhook).

- [ ] **Step 10: Push the Orders schema to the test DB so later e2e/build works**

The new columns need to exist in the DB Payload boots against. Run a quick Payload boot to trigger dev schema-push against the Neon test branch:

Run: `node ./node_modules/vitest/vitest.mjs run --config seed.vitest.config.ts 2>/dev/null || npx vitest run tests/payload* 2>/dev/null || echo "boot Payload via any DB-backed vitest test to push schema"`
Expected: a DB-backed test boots Payload (which auto-pushes the additive columns). If unsure, run the full `npm run test` — the additive columns are harmless.

- [ ] **Step 11: Commit**

```bash
git add lib/checkout.ts app/api/stripe/checkout/route.ts collections/Orders.ts app/api/stripe/webhook/route.ts tests/stripe/
git commit -m "feat(order): persist extraMinutes, addOns, and plotNote onto the order"
```

---

## Task 2: Extract configurator into a folder (no behavior change)

Pure refactor — reorganize `components/home/configurator.tsx` into focused files so the wizard can build on small pieces. The app must look and behave **identically** after this task; the existing `e2e/checkout.spec.ts` is the guard.

**Files:**
- Create: `components/home/configurator/index.tsx` (the current `Configurator`, importing the extracted pieces)
- Create: `components/home/configurator/segmented.tsx`
- Create: `components/home/configurator/range-slider.tsx`
- Create: `components/home/configurator/world-picker.tsx`
- Create: `components/home/configurator/price-rail.tsx`
- Delete: `components/home/configurator.tsx`
- Modify: `app/page.tsx` (import path — see Step 5)
- Modify: `fairy-tale-mind/map/zones/configurator.md` (glob — see Step 6)

- [ ] **Step 1: Create the shared control files**

Move each component out of `configurator.tsx` verbatim into its own `"use client"` file, exporting it and importing what it needs:

- `segmented.tsx` ← the `Segmented` function + its `SegOption` type + the `pct`/`usd` helpers it uses. Export `Segmented` and `type SegOption`.
- `range-slider.tsx` ← the `RangeSlider` function (imports `EXTRA_MINUTE_PRICE` from `@/lib/pricing`, `usd` helper).
- `world-picker.tsx` ← the `WorldPicker` function (imports `WORLDS, type WorldId` from `@/lib/worlds`).
- `price-rail.tsx` ← the `AnimatedNumber` + `SummaryRow` functions AND the entire `{/* Summary rail */}` `<div>` markup, wrapped as a `PriceRail` component. Give it props for everything it renders:

```tsx
"use client";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";
import type { AddOn, DetailLevel, LengthTier } from "@/lib/pricing";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const pct = (m: number) => Math.round((m - 1) * 100);

export function PriceRail(props: {
  total: number; totalMinutes: number; lvl: DetailLevel; tier: LengthTier;
  extraMinutes: number; minutesCost: number; chosenAddOns: AddOn[]; surcharge: number;
  cta: React.ReactNode;   // the wizard passes the Continue/Checkout button + status copy
}) { /* …move the rail JSX here; render {props.cta} where the button + reassurance text were… */ }
```

Keep `AnimatedNumber` and `SummaryRow` private inside this file.

- [ ] **Step 2: Create `index.tsx` from the remaining shell**

`components/home/configurator/index.tsx` = the current `Configurator` function (state, derived price math, `startCheckout`, `lengthOptions`/`detailOptions`, the `<section id="build">` wrapper, the left controls block) — now importing `Segmented`, `RangeSlider`, `WorldPicker`, `PriceRail` from the sibling files. The rail's button + reassurance `<AnimatePresence>` move into a `cta` element passed to `<PriceRail cta={…} />`. Keep `AnimatedHeading` import. Keep the exported name `Configurator`.

- [ ] **Step 3: Delete the old file**

```bash
git rm components/home/configurator.tsx
```

- [ ] **Step 4: Update the import in `app/page.tsx`**

Find the import and point it at the folder (same name; Next resolves `index.tsx`):

```ts
import { Configurator } from "@/components/home/configurator";
```

(If it was `@/components/home/configurator` already, no change is needed — the folder index resolves identically.)

- [ ] **Step 5: Verify the build compiles + existing e2e still passes**

Run: `npx tsc --noEmit` → Expected: clean.
Run: `npm run test:e2e -- e2e/checkout.spec.ts` → Expected: PASS (behavior unchanged).

- [ ] **Step 6: Update the configurator zone glob**

In `fairy-tale-mind/map/zones/configurator.md`, replace the glob line
`- "components/home/configurator.tsx"` with
`- "components/home/configurator/**"`.

- [ ] **Step 7: Commit**

```bash
git add components/home/configurator app/page.tsx fairy-tale-mind/map/zones/configurator.md
git commit -m "refactor(configurator): split into focused files (no behavior change)"
```

---

## Task 3: Wizard shell — 3 steps, step nav, transitions

Turn the single panel into a 3-step flow. The price rail stays mounted; the left panel swaps step content. The rail's primary button advances (steps 1–2) or checks out (step 3).

**Files:**
- Create: `components/home/configurator/step-nav.tsx`
- Create: `components/home/configurator/step-film.tsx`
- Create: `components/home/configurator/step-story.tsx`
- Create: `components/home/configurator/step-photos.tsx` (recap-only here; dropzone added in Task 4)
- Modify: `components/home/configurator/index.tsx`
- Modify: `e2e/checkout.spec.ts`

- [ ] **Step 1: Update the e2e checkout flow (RED)**

Rewrite the interaction portion of `e2e/checkout.spec.ts` to walk the wizard. Replace the body from `await page.goto("/#build");` through the click with:

```ts
  await page.goto("/#build");

  // Step 1 — The film: defaults are fine (medium / basic / narration / 0 extra). Continue.
  await page.getByRole("button", { name: /Continue/ }).click();

  // Step 2 — The story: pick a plot + name, then Continue.
  await page.locator("label").filter({ hasText: "Outer space" }).first().click();
  await page.getByRole("textbox", { name: "Who is it for?" }).fill("Ada");
  await page.getByRole("button", { name: /Continue/ }).click();

  // Step 3 — Photos & checkout.
  await page.getByRole("button", { name: /Create their video/ }).click();

  await page.waitForURL("https://checkout.stripe.com/**");
```

Keep the existing `expect(posted).toMatchObject({ childName: "Ada", world: "space", length: "medium", detail: "basic", extraMinutes: 0 })` and the addOns assertion.

Run: `npm run test:e2e -- e2e/checkout.spec.ts` → Expected: FAIL (no "Continue" button yet / single-page form).

- [ ] **Step 2: Create `step-nav.tsx`**

A step indicator + Back control. Complete component:

```tsx
"use client";
const STEPS = ["The film", "The story", "Photos & checkout"];
export function StepNav({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="mb-7 flex items-center justify-between">
      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-brand-deep text-sm font-black ${
                  active ? "bg-brand-pink text-white" : done ? "bg-brand-deep text-white" : "bg-white text-brand-deep"
                }`}
              >
                {n}
              </span>
              <span className={`hidden text-sm font-bold sm:inline ${active ? "text-brand-deep" : "text-brand-deep/50"}`}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {step > 1 ? (
        <button type="button" onClick={onBack} className="text-sm font-bold text-brand-deep/60 underline-offset-4 hover:underline">
          ← Back
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Create the three step components**

Move the existing left-panel controls into step components, each receiving the state/handlers it needs as props (no internal state). The shell owns all state.

- `step-film.tsx` — exports `StepFilm` rendering: `<Segmented legend="Length" …/>`, `<RangeSlider …/>`, `<Segmented legend="Detail level" …/>`, and the Add-ons `<fieldset>` (move that JSX verbatim). Props: `lengthOptions, length, setLength, extraMinutes, setExtraMinutes, totalMinutes, minutesCost, detailOptions, detail, setDetail, addOns, toggleAddOn, chosenAddOns`.
- `step-story.tsx` — exports `StepStory` rendering: the "Who is it for?" name `<input>` block (move verbatim), `<WorldPicker …/>`, and a NEW plot-note textarea below the picker:

```tsx
<div>
  <label htmlFor="plot-note" className="font-[family-name:var(--font-fredoka)] text-xl font-semibold">
    Your own plot idea <span className="text-base font-medium text-brand-deep/50">(optional)</span>
  </label>
  <textarea
    id="plot-note" value={plotNote} maxLength={500}
    onChange={(e) => setPlotNote(e.target.value)}
    placeholder="A brave knight who is afraid of the dark, and the kitten who helps them…"
    rows={3}
    className="mt-4 w-full rounded-2xl border-[3px] border-brand-deep bg-brand-cream px-4 py-3 text-base font-semibold text-brand-deep outline-none placeholder:text-brand-deep/40 focus-visible:ring-4 focus-visible:ring-brand-pink/40"
  />
  <p className="mt-3 text-sm font-medium text-brand-deep/60">
    Tell us anything you'd like in the story. Most helpful when you pick a story of your own.
  </p>
</div>
```

  Props: `childName, setChildName, world, setWorld, plotNote, setPlotNote`.
- `step-photos.tsx` — exports `StepPhotos`. For now (dropzone comes in Task 4) render a short recap heading + a one-line summary of the chosen film + plot:

```tsx
"use client";
export function StepPhotos({ summary }: { summary: string }) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-fredoka)] text-xl font-semibold text-brand-deep">Almost there</h3>
      <p className="mt-2 text-sm font-medium text-brand-deep/60">{summary}</p>
      {/* Task 4 inserts <PhotoDropzone/> here */}
    </div>
  );
}
```

- [ ] **Step 4: Wire the shell (`index.tsx`)**

Add to the state:

```ts
  const [plotNote, setPlotNote] = useState("");
  const [step, setStep] = useState(1);
```

Add `plotNote` to the `startCheckout` POST body (after `addOns`):

```ts
          addOns,
          plotNote: plotNote.trim(),
```

Replace the left-panel `<div className="space-y-9 …">` contents with the step switch + nav:

```tsx
  <div className="space-y-9 p-7 sm:p-9">
    <StepNav step={step} onBack={() => setStep((s) => Math.max(1, s - 1))} />
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={reduce ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={reduce ? undefined : { opacity: 0, x: -24 }}
        transition={{ duration: 0.22 }}
      >
        {step === 1 && <StepFilm {/* …all film props… */} />}
        {step === 2 && <StepStory childName={childName} setChildName={setChildName} world={world} setWorld={setWorld} plotNote={plotNote} setPlotNote={setPlotNote} />}
        {step === 3 && <StepPhotos summary={summarizeSelections({ length, detail, extraMinutes, addOns })} />}
      </motion.div>
    </AnimatePresence>
  </div>
```

Import `useReducedMotion` (already imported via motion) and add `const reduce = useReducedMotion();` at the top of the component. Import `summarizeSelections` from `@/lib/pricing`.

Make the rail's primary button context-aware. Build the `cta` element the shell passes to `<PriceRail>`:

```tsx
  const onPrimary = () => (step < 3 ? setStep((s) => s + 1) : startCheckout());
  const primaryLabel =
    step < 3 ? "Continue →" : status === "pending" ? "Taking you to checkout…" : "Create their video →";
```

The `cta` keeps the existing `<motion.button>` markup but uses `onClick={onPrimary}`, `disabled={status === "pending"}`, and `{primaryLabel}`, followed by the existing error/reassurance `<AnimatePresence>` block.

- [ ] **Step 5: Update the intro copy**

In `index.tsx`, change the intro `<p>` under the heading to reflect the new order:

> "Start with the film, then tell us the story and who it's for. Add photos and check out when you're ready. You can change anything before we animate a thing."

- [ ] **Step 6: Run the e2e to verify pass**

Run: `npm run test:e2e -- e2e/checkout.spec.ts` → Expected: PASS.
Run: `npx tsc --noEmit` → Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add components/home/configurator e2e/checkout.spec.ts
git commit -m "feat(configurator): 3-step wizard (film / story / photos+checkout)"
```

---

## Task 4: UI-only photo dropzone in step 3

A presentational dropzone: drag/drop + pick, thumbnail previews, client-side validation (reusing `validateUploadFile`), remove. It does **not** upload — a clear note says photos finalize in the dashboard after checkout.

**Files:**
- Create: `components/home/configurator/photo-dropzone.tsx`
- Modify: `components/home/configurator/step-photos.tsx`

- [ ] **Step 1: Create `photo-dropzone.tsx`**

```tsx
"use client";
import { useRef, useState } from "react";
import { validateUploadFile } from "@/lib/order-upload-validation";

type Pic = { file: File; url: string };

export function PhotoDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pics, setPics] = useState<Pic[]>([]);
  const [error, setError] = useState<string | null>(null);

  function add(list: FileList | null) {
    setError(null);
    const picked = Array.from(list ?? []);
    for (const f of picked) {
      const check = validateUploadFile(f);
      if (!check.ok) return setError(check.error);
    }
    setPics((prev) => [...prev, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }
  function remove(i: number) {
    setPics((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  return (
    <div className="mt-5">
      <label
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-brand-deep/40 bg-brand-cream px-5 py-8 text-center transition-colors hover:border-brand-deep"
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
        <span className="font-[family-name:var(--font-fredoka)] text-lg font-semibold text-brand-deep">
          Drag photos here, or choose files
        </span>
        <span className="mt-1 text-sm font-medium text-brand-deep/60">JPEG, PNG, or HEIC, up to 15 MB each</span>
      </label>

      {error ? <p role="alert" className="mt-3 text-sm font-bold text-brand-pink">{error}</p> : null}

      {pics.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {pics.map((p, i) => (
            <li key={p.url} className="relative">
              {/* object URL preview — next/image not needed for a transient blob */}
              <img src={p.url} alt="" className="h-20 w-20 rounded-xl border-[3px] border-brand-deep object-cover" />
              <button
                type="button" onClick={() => remove(i)} aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-brand-deep bg-white text-xs font-black text-brand-deep"
              >×</button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 rounded-xl border-[3px] border-brand-deep bg-brand-yellow/40 px-4 py-3 text-sm font-semibold text-brand-deep">
        You'll upload these in your dashboard right after checkout, so we can attach them to your order. Adding them here is just a preview.
      </p>
    </div>
  );
}
```

Note: `<img>` (not `next/image`) is correct here — the source is a transient `blob:` object URL. Add an `eslint-disable-next-line @next/next/no-img-element` comment above the `<img>` if the build lints it.

- [ ] **Step 2: Render it in `step-photos.tsx`**

Import and place `<PhotoDropzone />` where the `{/* Task 4 inserts … */}` comment is.

- [ ] **Step 3: Verify compile + e2e still green**

Run: `npx tsc --noEmit` → clean.
Run: `npm run test:e2e -- e2e/checkout.spec.ts` → PASS (dropzone doesn't block checkout).

- [ ] **Step 4: Commit**

```bash
git add components/home/configurator
git commit -m "feat(configurator): UI-only photo dropzone with previews in step 3"
```

---

## Task 5: Sign-in "Place an order" CTA

**Files:**
- Modify: `app/(app)/sign-in/page.tsx`
- Modify: `e2e/sign-in.spec.ts`

- [ ] **Step 1: Add the CTA assertion to the e2e (RED)**

In `e2e/sign-in.spec.ts`, after the "No account to create" heading assertion, add:

```ts
  const placeOrder = page.getByRole("link", { name: "Place an order" });
  await expect(placeOrder).toBeVisible();
  await expect(placeOrder).toHaveAttribute("href", "/#build");
```

Run: `npm run test:e2e -- e2e/sign-in.spec.ts` → Expected: FAIL (no such link).

- [ ] **Step 2: Add the CTA to the no-account card**

In `app/(app)/sign-in/page.tsx`, inside the "No account to create" `<div>`, after the explainer `<p>…</p>`, add:

```tsx
          <a
            href="/#build"
            className="mt-5 inline-flex items-center gap-1 rounded-xl border-2 border-brand-deep bg-brand-yellow px-5 py-2.5 font-semibold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Place an order →
          </a>
```

- [ ] **Step 3: Verify pass**

Run: `npm run test:e2e -- e2e/sign-in.spec.ts` → Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/(app)/sign-in/page.tsx e2e/sign-in.spec.ts
git commit -m "feat(sign-in): add 'Place an order' CTA to the no-account card"
```

---

## Task 6: Full verification + Mind maintenance

**Files:**
- Modify: `fairy-tale-mind/map/zones/configurator.md`
- Modify: `fairy-tale-mind/map/zones/checkout.md`
- Create: `fairy-tale-mind/map/decisions/configurator-wizard.md`

- [ ] **Step 1: Run the whole suite**

Run: `npm run test:all`
Expected: vitest green (incl. the new stripe assertions) + Playwright Layer A+B green.

- [ ] **Step 2: Browser verify the wizard (mobile + desktop)**

Start dev on a free port (NOT 3000/3002): `npx next dev -p 3007`. With the Playwright MCP, at 375px and 1280px: step through film → story → photos, confirm the step indicator, Back/Next, animated transitions, the persistent price rail/total, the plot-note textarea, and the dropzone previews + remove. Screenshot each width. Confirm `/#build` from `/sign-in`'s "Place an order" scrolls to the builder.

- [ ] **Step 3: Update the configurator + checkout zones**

In `configurator.md` Purpose/Checkout sections, describe the 3-step structure and that `extraMinutes`, `addOns`, and `plotNote` now ride in the checkout POST + Stripe metadata. In `checkout.md`, note the metadata now carries `extraMinutes`, `addOns`, `plotNote` and the webhook persists them. Re-stamp both `verifiedAt` to the latest commit (do this in the same commit that follows; reference the prior code commit SHA as in repo convention).

- [ ] **Step 4: Add a decision record**

`fairy-tale-mind/map/decisions/configurator-wizard.md` — capture: why a 3-step wizard; why photos are UI-only in step 3 (order created post-payment + no Blob yet, dashboard remains the real upload path); why all selection fields now persist (the previous order record dropped extraMinutes/addOns); checkout stays Stripe-hosted. Link `[[configurator]]`, `[[checkout]]`, `[[payload-backend]]`.

- [ ] **Step 5: Regenerate the index + commit**

```bash
npm run mind
git add fairy-tale-mind
git commit -m "docs(mind): configurator wizard zones + decision record"
```

- [ ] **Step 6: Finish the branch**

Use superpowers:finishing-a-development-branch (verify tests pass → present merge/PR options).

---

## Notes for the implementer
- **No pricing changes.** `lib/pricing.ts` values are untouched; the displayed total must stay `computeTotalCents(selections) / 100`.
- **childName stays optional** (empty allowed — the parent can add it later).
- **Stripe metadata limits**: 50 keys / 500 chars per value — `plotNote` is capped at 500 both client-side (`maxLength={500}`) and server-side (`.slice(0, 500)`).
- **Keep `id="build"`** on the section so all `#build` anchors/CTAs (nav Start, sign-in CTA) still land here.
- **Keep the checkout button label** containing "Create their video" (e2e + brand depend on it).
