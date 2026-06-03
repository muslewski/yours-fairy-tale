---
type: spec
summary: "Restructure the single-form #build configurator into a 3-step wizard (The film → The story → Photos & checkout), persist every configured field (extraMinutes, addOns, plotNote) end-to-end onto the order, add a UI-only photo dropzone in step 3, and add a 'Place an order' CTA to the sign-in page's no-account card. Pricing source and Stripe-hosted checkout are unchanged."
tags: [configurator, checkout, conversion, auth-gating]
status: planned
created: 2026-06-04
updated: 2026-06-04
related: ["[[configurator]]", "[[checkout]]", "[[auth-gating]]", "[[payload-backend]]"]
sources: ["[[configurator]]", "[[checkout]]"]
origin: "Brainstorm 2026-06-04: the parent-facing builder felt like one long form. Split into 3 guided steps, make sure all configured fields are actually saved on the order, wire the photo-upload affordance in the UI now (storage later), and turn the sign-in no-account explainer into an actionable path back to the builder."
---

# Configurator 3-step wizard + sign-in CTA — design

## Goal
Turn the `#build` configurator from one long scroll into a **3-step wizard** that feels
guided, and make the order record **complete** — today only `childName/world/length/detail`
reach the order; `extraMinutes`, `addOns`, and a new custom `plotNote` do not. Also give
non-customers on `/sign-in` a one-click path back to the builder.

This is UX + data-completeness, **not** a pricing or payment-flow change.

## Decided constraints (from brainstorm)
- **Photos in step 3 are UI-only.** The order does not exist until after Stripe payment,
  and Blob storage is not wired. So step 3 shows a real dropzone (drag/drop, thumbnail
  previews, type/size validation, remove) but does **not** persist files. The dashboard's
  existing post-purchase uploader (`[[payload-backend]]` Orders.assets) stays the real
  upload path. Step 3 copy makes this explicit ("you'll finalize photos in your dashboard
  right after checkout").
- **Plot step = presets + custom note.** Keep the preset world chips and add an optional
  free-text "your own plot idea" textarea (most useful with the `custom` world).
- **Checkout stays Stripe-hosted.** Step 3's CTA POSTs selections to
  `/api/stripe/checkout` and redirects to the Stripe URL exactly as today. No embedded
  payment, no webhook payment changes.

## The three steps
1. **The film** — Length (segmented), Extra minutes (slider), Detail level (segmented),
   Add-ons (chips). Today's pricing controls, regrouped.
2. **The story** — Plot (world chips) + optional **"Your own plot idea"** textarea +
   **Who is it for** (child's first name).
3. **Photos & checkout** — UI-only photo dropzone + order recap + "Proceed to secure
   checkout" → Stripe.

## Shell, navigation, price
- State stays lifted in the wizard shell (as today), plus a `step` (1 | 2 | 3).
- A step indicator (1·2·3 with short labels) + **Back / Next**; step 3's primary button is
  the checkout CTA.
- **No hard gates** — world/length/detail have defaults and child name is optional (the
  existing "childName may be empty, parent adds later" rule holds), so Next is always
  enabled. Low friction.
- Animated step transitions via Motion (`AnimatePresence`), guarded by `useReducedMotion`.
- The **running price total stays visible across all three steps** — the right rail on
  desktop, a compact sticky summary on mobile — so the number never disappears mid-flow.
- The section keeps `id="build"` so every existing `#build` CTA/anchor still lands here.

## Persistence — the "save accordingly" fix
End-to-end so the order reflects everything the parent chose:
- **`lib/checkout.ts`** — add to Stripe `metadata`: `extraMinutes` (string), `addOns`
  (comma-joined string), `plotNote` (capped to Stripe's 500-char/value limit). Pricing math
  is unchanged (it already consumes the full input).
- **`app/api/stripe/webhook/route.ts`** — read those metadata keys and write them onto the
  created order. Parse `extraMinutes` to a number, split `addOns` back into an array.
- **`collections/Orders.ts`** — add fields: `extraMinutes` (number), `addOns` (array of
  text), `plotNote` (textarea). Dev schema-push migrates the local/Neon DBs.
- **Photos** — not persisted at checkout (UI-only); no schema change beyond the existing
  `assets` relationship.

## Sign-in CTA
On `app/(app)/sign-in/page.tsx`, inside the existing **"No account to create"** card (copy
unchanged), add a secondary **"Place an order"** button/link to `/#build`. On-brand
sentence case, comic-outline secondary style. Turns the explainer into an actionable path.

## File structure
Split the ~500-line `components/home/configurator.tsx` into a focused folder
`components/home/configurator/`:
```
index.tsx          # wizard shell: all selection state, step state, layout, checkout POST
step-film.tsx      # step 1 controls
step-story.tsx     # step 2: world-picker + plot note + child name
step-photos.tsx    # step 3: photo dropzone (UI-only) + recap
price-rail.tsx     # running total + line-item summary (shared across steps)
step-nav.tsx       # step indicator + Back/Next
segmented.tsx      # extracted shared control
range-slider.tsx   # extracted shared control
world-picker.tsx   # extracted shared control
photo-dropzone.tsx # UI-only dropzone (previews, validation, remove)
```
`app/page.tsx` keeps importing `Configurator` from the folder's `index.tsx` (same public
import path / name).

## What the suite must still answer
| Question | Covered by |
|---|---|
| Configurator POSTs correct selections + redirects | `e2e/checkout.spec.ts` (updated to walk the 3 steps) |
| Displayed total === server charge | `tests/lib/pricing.test.ts` (unchanged) |
| Checkout metadata carries ALL fields | `tests/stripe/checkout.test.ts` (extended: extraMinutes/addOns/plotNote) |
| Order persists ALL fields | webhook test (extended) |
| Sign-in shows no-account explainer + "Place an order" → /#build | `e2e/sign-in.spec.ts` (extended) |

## Testing
- **vitest**: extend `tests/stripe/checkout.test.ts` (metadata now includes extraMinutes,
  addOns, plotNote); extend the webhook test to assert those land on the order; pricing
  tests unchanged.
- **Playwright Layer A** (`e2e/checkout.spec.ts`): drive the wizard — fill step 1, Next,
  step 2 (pick a plot, type a name, optional note), Next, step 3 → click checkout; assert
  the intercepted POST body still carries the right selections and the redirect happens.
- **Playwright Layer A** (`e2e/sign-in.spec.ts`): assert the "Place an order" CTA exists and
  points at `/#build` (alongside the existing "No account to create" assertion).
- Browser verify at mobile (375) + desktop (1280): step flow, transitions, price rail,
  dropzone previews.

## Out of scope
- Real photo storage / Vercel Blob wiring (UI-only now; see `[[payload-backend]]`).
- Embedded on-page payment (staying Stripe-hosted).
- Any price changes (`lib/pricing.ts` values untouched).
- Per-step hard validation / required fields.

## Risks / notes
- **Stripe metadata limits**: 50 keys, 500 chars/value. `plotNote` is the only unbounded
  input → cap at 500 chars client- and server-side. `addOns` comma-joined is tiny.
- **Schema push**: adding Orders fields requires a dev schema push against local + the Neon
  test branch; harmless additive columns.
- **Mind**: update `[[configurator]]` (3-step structure + new persisted fields) and
  `[[checkout]]` (metadata now carries extraMinutes/addOns/plotNote); re-stamp both; add a
  decision record for the wizard + UI-only-photos rationale.
