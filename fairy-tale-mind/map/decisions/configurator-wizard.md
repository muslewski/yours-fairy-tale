---
type: decision
summary: "The #build configurator is a 3-step wizard (film → story → photos+checkout). Photos in step 3 are UI-only (preview/validate, no upload) because the order is created only after Stripe payment and Blob storage isn't wired — the dashboard remains the real upload path. All selection fields (extraMinutes, addOns, plotNote) now persist onto the order. Checkout stays Stripe-hosted."
tags: [configurator, checkout, conversion]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[configurator]]", "[[checkout]]", "[[payload-backend]]"]
sources: ["[[2026-06-04-configurator-wizard-design]]"]
decided: 2026-06-04
supersededBy: ""
---

## Context
The personalized-video builder (`#build`) was a single long form. We wanted a guided,
less-overwhelming flow, and noticed the order record was incomplete — only
`childName/world/length/detailLevel` reached the order; `extraMinutes` and `addOns` were
dropped (price was still correct, since it's computed from the full input, but the saved
order under-described what the parent chose).

## Decision
- **3-step wizard** in one client component (`components/home/configurator/index.tsx`)
  holding all selection + `step` state. Step content swaps in the left panel via
  `AnimatePresence` (guarded by `useReducedMotion`); the price rail stays mounted so the
  total is always visible. Steps: **The film** (length/extra-minutes/detail/add-ons) →
  **The story** (plot/world + optional free-text plot idea + child's name) → **Photos &
  checkout**.
- **Persist everything**: `extraMinutes`, `addOns` (comma-joined), and the new free-text
  `plotNote` (capped at Stripe's 500-char metadata limit) now flow client → Stripe metadata
  → webhook → the Orders collection (`extraMinutes` number, `addOns` text[], `plotNote`
  textarea).
- **Photos in step 3 are UI-only** — a dropzone with previews + client-side validation
  (reusing `validateUploadFile`) and remove, but **no upload**. A note tells the parent
  they'll finalize photos in their dashboard right after checkout.
- **Checkout stays Stripe-hosted** — step 3's CTA POSTs selections to
  `/api/stripe/checkout` and redirects, exactly as before. No embedded payment.

## Why (the non-obvious bits)
- **Why UI-only photos:** the order doesn't exist until *after* Stripe payment (the webhook
  creates it from the session), and Vercel Blob isn't wired (`[[payload-backend]]` has the
  `@payloadcms/storage-vercel-blob` dep but no storage adapter configured). Files held in the
  browser are also lost across the Stripe redirect. So there's nothing to attach photos to,
  and nowhere to store them, pre-payment. The dashboard's existing post-purchase uploader
  (Orders.assets) remains the real path. Wiring the dropzone now means the UX is ready the
  moment Blob lands.
- **Why all fields persist now:** an order that doesn't record the add-ons/extra-minutes the
  customer paid for is a support and fulfillment hazard. Cheap to fix (metadata + 3 columns).
- **Why no `"use client"` on the split files:** only `index.tsx` is the client boundary; the
  step/control leaves are imported into it. A redundant directive on a leaf that exports a
  component with function props trips Next 16 warning 71007 (serializable-props on client
  entry files). Directive lives only on `index.tsx`.

## Consequences
- The single-form configurator is gone; `components/home/configurator/` is now a folder of
  focused files. `id="build"` is preserved, so all `#build` anchors/CTAs (nav Start, the new
  sign-in "Place an order" CTA) still land on the builder.
- `e2e/checkout.spec.ts` now walks the 3 steps; `tests/stripe/*` assert the new fields in
  metadata + on the persisted order.
- Real photo upload at/around checkout is deferred until Blob storage is configured — when it
  is, revisit whether step-3 photos should stage pre-payment (see
  `[[manual-vercel-deploy-breaks-mind-verifier]]` is unrelated; the Blob gap is tracked in
  `[[payload-backend]]`).
