# Detail-Tier Previews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let studio staff attach a preview image, title, and description to each configurator detail level (basic/detailed/premium) and show them in a live preview panel in the configurator — all editable without a deploy.

**Architecture:** Extend the existing admin-editable `pricing` Payload Global's `details[]` array with three optional fields (`image` upload→`site-media`, `title`, `description`). The resolver (`getPricing()`) reads them at depth 1, resolves the public image URL, and passes them as part of the `Pricing` prop to the client configurator, which renders a new `DetailPreview` panel under the "Detail level" control. Schema change ships as an ADD-only migration. Pricing math, checkout, and revalidation are untouched.

**Tech Stack:** Next.js 16 (App Router), React 19, Payload CMS 3.85, Postgres (`@payloadcms/db-postgres`), Vercel Blob storage, Motion (`motion/react`), Tailwind v4, Vitest.

## Global Constraints

- **Spec:** `fairy-tale-mind/specs/2026-06-24-detail-tier-previews-design.md`.
- **Colors:** never hardcode hex. Use brand Tailwind utilities (`border-brand-deep`, `text-brand-deep`, `bg-brand-cream`) or `var(--color-brand-*)`.
- **Comic shadow:** use `shadow-comic` / `shadow-comic-sm` tokens, not `shadow-[...]`.
- **Fonts:** display/headline = `var(--font-fredoka)` via `font-[family-name:var(--font-fredoka)]`; body = default.
- **Motion:** import from `motion/react`; components using it need `"use client"`; guard self-moving animation with `useReducedMotion()`.
- **Brand voice:** calm, warm, parent-facing, child-is-hero. American English, sentence case (including titles/labels), no em-dashes, rare exclamation points, no comic SFX, no hype clichés.
- **New fields are display-only:** they must never affect `computeTotalCents` / `summarizeSelections` / checkout. All three are **optional**; UI must degrade when any is unset.
- **site-media is public** (`read: () => true`, `disablePayloadAccessControl: true`) → its resolved `.url` is a direct public CDN URL, safe to render with a plain `<img>`. Do NOT use `next/image` (no `remotePatterns` configured).
- **Migrations are ADD-only + idempotent** (`IF NOT EXISTS`, `duplicate_object` guards), introspected against Payload dev `push`, and registered in `migrations/index.ts`.
- **Single test run:** `npx vitest run <file>`; single test: add `-t "<name>"`.

---

### Task 1: Extend the shared `DetailLevel` shape + fallback copy

**Files:**
- Modify: `lib/pricing.ts` (`DetailLevel` type ~20-26; `DETAILS` const ~42-46)
- Test: `tests/lib/pricing.test.ts`

**Interfaces:**
- Produces: `DetailLevel` now has optional `image?: string` (resolved URL), `title?: string`, `description?: string`. `DEFAULT_PRICING.details` entries carry `title` + `description` (no `image`). `computeTotalCents`, `summarizeSelections`, `resolve` signatures unchanged.

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/pricing.test.ts` (in the existing top-level `describe`, or a new `describe("DEFAULT_PRICING detail previews", ...)`):

```ts
import { DEFAULT_PRICING, computeTotalCents } from "@/lib/pricing";

describe("detail-level preview fields", () => {
  test("every default detail level has title and description copy", () => {
    for (const d of DEFAULT_PRICING.details) {
      expect(typeof d.title).toBe("string");
      expect(d.title!.length).toBeGreaterThan(0);
      expect(typeof d.description).toBe("string");
      expect(d.description!.length).toBeGreaterThan(0);
    }
  });

  test("default detail levels ship no image (images live only in the global)", () => {
    for (const d of DEFAULT_PRICING.details) {
      expect(d.image).toBeUndefined();
    }
  });

  test("preview fields do not affect the computed total", () => {
    const sel = { length: "medium", detail: "premium", extraMinutes: 0, addOns: [] };
    expect(computeTotalCents(sel)).toBe(290 * 100); // multiplier 1.0, no add-ons
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/pricing.test.ts -t "preview"`
Expected: FAIL — `d.title` is `undefined` (type/data not yet added).

- [ ] **Step 3: Extend the type**

In `lib/pricing.ts`, replace the `DetailLevel` type:

```ts
export type DetailLevel = {
  id: string;
  label: string;
  /** Surcharge multiplier applied to the subtotal (1 = no surcharge). */
  multiplier: number;
  note: string;
  /** Resolved public URL of the preview image (site-media). Optional. */
  image?: string;
  /** Headline for the preview panel. Optional; falls back to label. */
  title?: string;
  /** Short paragraph describing what this tier captures. Optional. */
  description?: string;
};
```

- [ ] **Step 4: Add fallback copy to `DETAILS`**

Replace the `DETAILS` const (brand-voice approved copy):

```ts
export const DETAILS: DetailLevel[] = [
  {
    id: "basic",
    label: "Basic",
    multiplier: 1,
    note: "Clean, charming animation with all the essentials.",
    title: "The essentials, beautifully done",
    description:
      "Clean, charming animation with your child as the hero. Their name, their world, their story, told simply and warmly.",
  },
  {
    id: "detailed",
    label: "Detailed",
    multiplier: 1,
    note: "Richer backgrounds and more movement in every scene.",
    title: "Their world, in the details",
    description:
      "We carry through the little things that make it theirs: the color of a favorite cup, a beloved toy, the patterns on their clothes.",
  },
  {
    id: "premium",
    label: "Premium",
    multiplier: 1,
    note: "Our finest work, with lush detail in every frame.",
    title: "Every little detail, cherished",
    description:
      "Our finest work. The fine touches come along too, from a tiny necklace to a favorite watch, so every frame feels made just for them.",
  },
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/pricing.test.ts`
Expected: PASS (new tests + all existing pricing tests).

- [ ] **Step 6: Commit**

```bash
git add lib/pricing.ts tests/lib/pricing.test.ts
git commit -m "feat(pricing): add image/title/description to DetailLevel + fallback copy"
```

---

### Task 2: Resolve the preview fields in `getPricing()`

**Files:**
- Modify: `lib/pricing-source.ts` (`PricingGlobalDoc.details` ~22; `findGlobal` call ~33-34; `details` map ~60-65)
- Test: `tests/lib/pricing-source.test.ts`

**Interfaces:**
- Consumes: `DetailLevel` (`image?`, `title?`, `description?`) from Task 1.
- Produces: `readPricing()` resolves `details[].image` from a populated upload object's `.url`, and maps `title`/`description`; missing values become `undefined`. `getPricing` reads at `depth: 1`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/lib/pricing-source.test.ts`:

```ts
test("resolves a populated detail image object to its url + maps title/description", async () => {
  const doc = {
    lengths: [{ id: "short", label: "Short", minutes: 3, price: 200, note: null }],
    details: [
      {
        id: "basic",
        label: "Basic",
        multiplier: 1,
        note: null,
        image: { url: "https://cdn.example.com/site/basic.webp" },
        title: "The essentials",
        description: "Clean and charming.",
      },
    ],
    addOns: [],
    extraMinutePrice: 55,
    maxExtraMinutes: 30,
  };
  mockClient.mockResolvedValue({ findGlobal: vi.fn().mockResolvedValue(doc) });

  const p = await readPricing();
  expect(p.details[0].image).toBe("https://cdn.example.com/site/basic.webp");
  expect(p.details[0].title).toBe("The essentials");
  expect(p.details[0].description).toBe("Clean and charming.");
});

test("leaves image undefined when the detail has no image (no throw)", async () => {
  const doc = {
    lengths: [{ id: "short", label: "Short", minutes: 3, price: 200, note: null }],
    details: [{ id: "basic", label: "Basic", multiplier: 1, note: null, image: null }],
    addOns: [],
    extraMinutePrice: 55,
    maxExtraMinutes: 30,
  };
  mockClient.mockResolvedValue({ findGlobal: vi.fn().mockResolvedValue(doc) });

  const p = await readPricing();
  expect(p.details[0].image).toBeUndefined();
  expect(p.details[0].title).toBeUndefined();
  expect(p.details[0].description).toBeUndefined();
});

test("requests the global at depth 1 so the image upload populates", async () => {
  const findGlobal = vi.fn().mockResolvedValue({
    lengths: [{ id: "short", label: "Short", minutes: 3, price: 200, note: null }],
    details: [{ id: "basic", label: "Basic", multiplier: 1, note: null }],
    addOns: [],
    extraMinutePrice: 55,
    maxExtraMinutes: 30,
  });
  mockClient.mockResolvedValue({ findGlobal });
  await readPricing();
  expect(findGlobal).toHaveBeenCalledWith(expect.objectContaining({ slug: "pricing", depth: 1 }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/pricing-source.test.ts -t "image"`
Expected: FAIL — `image` is `undefined` / `findGlobal` called without `depth`.

- [ ] **Step 3: Widen the loose doc type**

In `lib/pricing-source.ts`, replace the `details` line in `PricingGlobalDoc`:

```ts
  details?: Array<{
    id: string;
    label: string;
    multiplier: number;
    note?: string | null;
    image?: { url?: string | null } | string | null;
    title?: string | null;
    description?: string | null;
  }>;
```

- [ ] **Step 4: Read at depth 1 + map the new fields**

Change the `findGlobal` type cast and call to include `depth`:

```ts
    const findGlobal = payload.findGlobal as (args: { slug: string; depth?: number }) => Promise<PricingGlobalDoc>;
    const g = await findGlobal({ slug: "pricing", depth: 1 });
```

Replace the `details` map:

```ts
      details: g.details.map((d) => ({
        id: d.id,
        label: d.label,
        multiplier: d.multiplier,
        note: d.note ?? "",
        image: typeof d.image === "object" && d.image ? (d.image.url ?? undefined) : undefined,
        title: d.title ?? undefined,
        description: d.description ?? undefined,
      })),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/pricing-source.test.ts`
Expected: PASS (new + existing resolver tests).

- [ ] **Step 6: Commit**

```bash
git add lib/pricing-source.ts tests/lib/pricing-source.test.ts
git commit -m "feat(pricing): resolve detail preview image/title/description at depth 1"
```

---

### Task 3: Add the preview fields to the Payload Global

**Files:**
- Modify: `globals/Pricing.ts` (`details` array fields ~74-87)

**Interfaces:**
- Consumes: nothing new at runtime; field names must match the resolver/migration (`image`, `title`, `description`).
- Produces: the studio "Pricing → Detail levels" rows gain Image (upload→site-media), Title, Description inputs.

> No unit test — this is Payload config. It is verified by `npm run generate:types` (Step 2) and the build (Task 5 / final review).

- [ ] **Step 1: Add the three fields**

In `globals/Pricing.ts`, inside the `details` array `fields`, after `{ name: "note", type: "text" }`, add:

```ts
        {
          name: "image",
          type: "upload",
          relationTo: "site-media",
          admin: {
            description:
              "Preview image shown in the configurator for this detail level (public site media).",
          },
        },
        {
          name: "title",
          type: "text",
          admin: { description: "Headline above the preview image. Falls back to the label if empty." },
        },
        {
          name: "description",
          type: "textarea",
          admin: { description: "Short paragraph describing what this detail level captures." },
        },
```

- [ ] **Step 2: Regenerate Payload types**

Run: `npm run generate:types`
Expected: completes without error; `payload-types.ts` now includes `image`/`title`/`description` on the pricing details type.

- [ ] **Step 3: Commit**

```bash
git add globals/Pricing.ts payload-types.ts
git commit -m "feat(pricing): add image/title/description fields to Pricing global details"
```

---

### Task 4: Migration for the new `pricing_details` columns

**Files:**
- Create: `migrations/20260624_000000_pricing_detail_media.ts`
- Modify: `migrations/index.ts` (import + ordered entry)

**Interfaces:**
- Consumes: existing `pricing_details` + `site_media` tables (both present).
- Produces: `pricing_details.title varchar`, `pricing_details.description varchar`, `pricing_details.image_id uuid` (FK → `site_media(id)` ON DELETE SET NULL) + an index on `image_id`.

> First introspect what Payload dev `push` generates for these fields, then mirror it. The SQL below matches Payload's conventions (single upload relationship → `<field>_id` column; `textarea`/`text` → `varchar`). Adjust only if introspection differs.

- [ ] **Step 1: Create the migration file**

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds the per-detail-level preview fields to the `pricing` Global's
 * `pricing_details` array table: `title` + `description` text columns and an
 * `image_id` upload relationship to the public `site_media` collection.
 *
 * ADD-only and idempotent (IF NOT EXISTS / duplicate_object guard), matching the
 * sibling migrations' posture. ON DELETE SET NULL: removing a site-media asset
 * blanks the reference rather than deleting the detail-level row.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "title" varchar;
    ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "description" varchar;
    ALTER TABLE "pricing_details" ADD COLUMN IF NOT EXISTS "image_id" uuid;

    DO $$ BEGIN
      ALTER TABLE "pricing_details"
        ADD CONSTRAINT "pricing_details_image_id_site_media_id_fk"
        FOREIGN KEY ("image_id") REFERENCES "site_media"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "pricing_details_image_idx" ON "pricing_details" USING btree ("image_id");
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "pricing_details_image_idx";
    ALTER TABLE "pricing_details" DROP COLUMN IF EXISTS "image_id";
    ALTER TABLE "pricing_details" DROP COLUMN IF EXISTS "description";
    ALTER TABLE "pricing_details" DROP COLUMN IF EXISTS "title";
  `);
}
```

- [ ] **Step 2: Register it in `migrations/index.ts`**

Follow the existing pattern in that file: add an `import * as migration_20260624_000000_pricing_detail_media from "./20260624_000000_pricing_detail_media";` and append a `{ up, down, name }` entry to the exported array, **after** `20260623_000000_pricing_global` (chronological order).

- [ ] **Step 3: Verify the migration applies**

Run: `npm run migrate` then `npm run migrate:status`
Expected: the new migration shows as applied; no errors. (If a local DB isn't available, defer this to the final review and note it.)

- [ ] **Step 4: Commit**

```bash
git add migrations/20260624_000000_pricing_detail_media.ts migrations/index.ts
git commit -m "feat(pricing): migration for pricing_details preview columns"
```

---

### Task 5: `DetailPreview` panel + configurator wiring

**Files:**
- Create: `components/home/configurator/detail-preview.tsx`
- Modify: `components/home/configurator/step-film.tsx` (props ~8-42; render below detail `Segmented` ~66)
- Modify: `components/home/configurator/index.tsx` (pass `selectedDetail` into `StepFilm` ~198-200 region)

**Interfaces:**
- Consumes: the resolved selected `DetailLevel` (`{ image?, title?, label, description?, note }`) — `lvl` already computed at `index.tsx:40`.
- Produces: a preview card under the "Detail level" control showing the selected tier's image/title/description, animated on change.

> No standalone unit test (presentational client component; the repo has no component-test harness for these). Verified via build + the final manual review / e2e. Keep it a pure function of props.

- [ ] **Step 1: Create `detail-preview.tsx`**

```tsx
"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DetailLevel } from "@/lib/pricing";

/**
 * Live preview for the selected configurator detail level: an admin-chosen
 * site-media image plus title/description, swapped as the parent changes tier.
 * Every field is optional — render nothing extra when a field is unset (no
 * broken <img>, no empty box). Falls back to `note` when `description` is empty
 * and to `label` when `title` is empty.
 */
export function DetailPreview({ detail }: { detail: DetailLevel }) {
  const reduce = useReducedMotion();
  const heading = detail.title || detail.label;
  const body = detail.description || detail.note;

  // Nothing meaningful to preview beyond what Segmented already shows.
  if (!detail.image && !detail.title && !detail.description) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={detail.id}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="mt-4 overflow-hidden rounded-2xl border-[3px] border-brand-deep bg-brand-cream shadow-comic-sm"
      >
        {detail.image && (
          <img
            src={detail.image}
            alt={heading}
            loading="lazy"
            className="block aspect-[16/9] w-full object-cover"
          />
        )}
        <div className="p-4">
          <p className="font-[family-name:var(--font-fredoka)] text-lg font-semibold text-brand-deep">
            {heading}
          </p>
          {body && <p className="mt-1 text-sm font-medium text-brand-deep/70">{body}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Thread `selectedDetail` through `step-film.tsx`**

Add the import at the top:

```tsx
import { DetailPreview } from "./detail-preview";
import type { AddOn, DetailLevel } from "@/lib/pricing";
```

(Replace the existing `import type { AddOn } from "@/lib/pricing";` with the combined line above.)

Add `selectedDetail: DetailLevel;` to both the destructured params and the props type. Then render the panel directly below the detail `Segmented` (after line ~66, before the `<fieldset>` Add-ons block):

```tsx
      <Segmented
        legend="Detail level"
        name="detail"
        options={detailOptions}
        selected={detail}
        onSelect={setDetail}
      />
      <DetailPreview detail={selectedDetail} />
```

- [ ] **Step 3: Pass `selectedDetail` from `index.tsx`**

In `components/home/configurator/index.tsx`, find where `<StepFilm ... />` is rendered (the `detailOptions`/`detail`/`setDetail` props) and add:

```tsx
        selectedDetail={lvl}
```

(`lvl` is the already-computed `details.find((o) => o.id === detail) ?? details[0]` at `index.tsx:40`.)

- [ ] **Step 4: Typecheck + build**

Run: `npx tsc --noEmit` (or `npm run build`)
Expected: no type errors; `DetailPreview` receives a `DetailLevel`.

- [ ] **Step 5: Commit**

```bash
git add components/home/configurator/detail-preview.tsx components/home/configurator/step-film.tsx components/home/configurator/index.tsx
git commit -m "feat(configurator): detail-level preview panel (image/title/description)"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all green, including the new pricing + resolver tests.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: compiles clean (also runs `npm run mind` via `prebuild`).

- [ ] **Step 3: Manual smoke (if a dev DB + seeded global available)**

In the studio, open Pricing → Detail levels, attach a site-media image + title + description to one tier, save. Load `/#build`, step to "The film", switch detail tiers — the preview panel swaps image/title/description; a tier with no image shows text only; nothing white-screens.

- [ ] **Step 4: Commit (if any verification fixups were needed)**

Otherwise nothing to commit here.

---

## Mind maintenance (recollection — after implementation)

- Update `fairy-tale-mind/map/zones/configurator.md`: re-stamp `verifiedAt` to HEAD; note the new `detail-preview.tsx` (covered by the existing `components/home/configurator/**` glob) and the depth-1 `getPricing()` read.
- Add a `fairy-tale-mind/map/decisions/` record: **rendering an admin-chosen `site-media` asset via a Payload upload relationship + public `.url`** (first use in repo; previously site-media was only consumed via a hardcoded blob URL).
- Run `npm run mind`; commit the regenerated `map/index.md` + the updated zone/decision docs to `main`.

## Self-Review (completed)

- **Spec coverage:** §1 Global → Task 3; §2 type+fallback → Task 1; §3 resolver → Task 2; §4 display → Task 5; §5 migration → Task 4; §6 tests → Tasks 1, 2; Mind → recollection section. All covered.
- **Placeholder scan:** none — every code step has full code.
- **Type consistency:** `DetailLevel` (`image?`/`title?`/`description?`) consistent across Tasks 1, 2, 5; field names (`image`/`title`/`description`) match between global (Task 3), resolver (Task 2), and migration column `image_id` (Task 4, Payload's `<field>_id` convention).
