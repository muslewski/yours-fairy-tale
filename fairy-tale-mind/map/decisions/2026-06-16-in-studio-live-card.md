---
type: decision
summary: "On in_production/revisions orders the customer order page shows an 'In the studio now' hero (big auto-playing builder mascot + a live count-UP 'crafting for 2d 06h 14m 32s' clock from a new orders.inStudioSince stamp, + the ready-by date), replacing the days-ring DeliveryCountdown for just those two states. The seconds-granularity count-up is reconciled with the deliberate days-granularity delivery COUNTDOWN: this is elapsed-since-start, not a countdown, and it collapses to days under reduced motion."
tags: [customer-area, orders, ux]
status: active
created: 2026-06-16
updated: 2026-06-16
related: ["[[auth-gating]]", "[[delivery-promise-auto-from-length]]"]
sources:
  - "components/app/studio-live-card.tsx"
  - "lib/studio-elapsed.ts"
  - "lib/in-studio-stamp.ts"
  - "fairy-tale-mind/specs/2026-06-16-in-studio-live-card-design.md"
decided: 2026-06-16
supersededBy: ""
---

## Context
The in_production state had nothing alive on it — a days ring and a static
message. We wanted the parent to feel that real work is happening right now.

## Decision
- A dedicated client component `StudioLiveCard` renders for `in_production` and
  `revisions` only, replacing `DeliveryCountdown` for those two states (it shows
  the ready-by date itself). Every other status keeps `DeliveryCountdown`.
- The hero is the existing animated builder mascot via `MascotImage` (auto-plays,
  still frame under reduced motion), perched at sign-in scale.
- The clock counts UP from a new `orders.inStudioSince`, stamped ONCE the first
  time an order enters production (Stripe webhook, customer upload auto-advance,
  studio transition — all via the pure `lib/in-studio-stamp.ts`), never reset.
  Legacy orders fall back to `createdAt`.

## Why
- A count-up of real production time is the sincere way to show "we are making
  this", and the seconds give the liveliness the brand owner asked for, without a
  resets-every-visit gimmick.
- It does NOT contradict [[delivery-promise-auto-from-length]]: that decision
  bans a ticking *countdown* (which reads like a shipping tracker). This is
  *elapsed time*, not a countdown, and under reduced motion it collapses to days
  granularity. The delivery promise is unchanged and still shown here.

## Consequences
- New column `orders.in_studio_since` (migration `20260616_000001_order_in_studio_since`).
- `heroName` is now exported from `lib/order-stages.ts`.
- `DeliveryCountdown`'s in_production branches are unreachable for those two
  statuses (left in place; still used by paid / awaiting_assets / proof_ready /
  approved).
- GOTCHA (fixed post-launch, 2026-06-17): the mascot smeared — every animation
  frame piled up on screen. ROOT CAUSE was the ASSET, not CSS: `builder-360.webp`
  and `builder-240.webp` shipped with every frame as a full-canvas `alpha-blend`
  + `dispose=none`, so each transparent-background frame composited over the last
  and accumulated. FIX: a lossless byte-patch flipping each ANMF frame's blend
  bit to `no-blend` (overwrite) — each full frame now fully replaces the canvas
  (verified in Chromium). `dispose=background` was NOT usable here: the file's
  ANIM background is opaque white, which would box the mascot. An earlier guess
  (removing a `drop-shadow` CSS filter) did NOT fix it; the mascot is kept
  filter-free anyway as a precaution (a CSS filter on an animated webp is a
  separate Chromium frame bug).
