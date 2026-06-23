---
type: zone
summary: "End-to-end order state machine — creation (via Stripe webhook), stage transitions (pending → in-production → delivered → cancelled), access-token-gated video delivery, and the customer-facing order detail/notes thread. Lives in lib/order-*.ts + app/(site)/(app)/."
tags: [order-lifecycle, orders, order-stages, delivery, video-access]
status: seeded
created: 2026-06-23
updated: 2026-06-23
verifiedAt: unverified
owns:
  globs:
    - "lib/order-*.ts"
    - "lib/delivery*.ts"
    - "lib/video-access.ts"
    - "app/(site)/(app)/**"
depends:
  - "[[checkout]]"
  - "[[payload-backend]]"
  - "[[studio]]"
---

## What this is

The order lifecycle zone owns everything from the moment a Stripe webhook fires through final video delivery. Orders are Payload-backed records with a multi-stage status field (order-stages.ts). Customers reach their orders via magic-link sign-in gated by the `auth-gating` zone; each order has a customer↔studio notes thread. Video delivery uses a short-lived signed access token (order-access-token.ts) to gate the Vercel Blob URL.

## Key files

- `lib/order-stages.ts` — stage enum, transition rules, guardrails
- `lib/order-actions.ts` — server actions for stage mutations
- `lib/order-action-cores.ts` — shared mutation cores (shared with studio)
- `lib/video-access.ts` — signed delivery URL generation
- `lib/delivery.ts` / `lib/delivery-url.ts` — delivery promise helpers
- `collections/Orders.ts` — Payload collection schema
