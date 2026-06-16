---
type: decision
summary: "Photos are collected in the configurator BEFORE checkout and associated to the order via blob pathnames carried in Stripe checkout metadata; the webhook head()s each and attaches metadata-only media, then promotes the order to in_production."
tags: [checkout, configurator, blob, webhook, media]
date: 2026-06-16
related: ["[[configurator]]", "[[checkout]]", "[[payload-backend]]", "[[two-media-collections-public-and-gated]]", "[[browser-to-blob-uploads-metadata-media]]"]
sources:
  - "fairy-tale-mind/specs/2026-06-15-pre-launch-ux-hardening-design.md"
  - "fairy-tale-mind/plans/2026-06-16-pre-launch-ux-hardening-phase3.md"
---

## Context
Pre-launch, checkout should be the LAST step: a parent configures the film, adds the
child's photos, then pays. But at configure time there is no account or order yet — the
Stripe webhook (`checkout.session.completed`) creates both AFTER payment. So pre-checkout
photos must be linked to an order that does not exist when they are uploaded.

## Decision
**Carry blob pathnames in Stripe checkout metadata; the webhook attaches them.**

1. The configurator's Step-3 dropzone uploads each photo **browser → Vercel Blob** via the
   Blob `clientUploads` flow (`@vercel/blob/client` `upload()`) through a NEW **anonymous**
   token route (`app/(site)/api/configurator/blob-upload/route.ts`): image-only content
   types, ≤ 15 MB, a forced `configurator/` pathname prefix, `addRandomSuffix`. It reuses the
   existing client re-encode (`prepareForUpload` — HEIC→JPEG, downscale) and is capped at
   `MAX_CHECKOUT_PHOTOS` (6). Each upload yields a unique blob **pathname**.
2. `startCheckout` sends the pathnames; `buildCheckoutSessionParams` writes
   `metadata.assetPaths = pathnames.join(",")`, capped at 6 and length-bounded to ≤ 480
   chars (Stripe's metadata value limit is 500).
3. The webhook reads `assetPaths`, and `attachCheckoutAssets` (`lib/order-action-cores.ts`)
   `head()`s each blob for its content-type/size and creates a **metadata-only** media doc
   (`filename == pathname`, the same contract as `attachVideoCore`), attaches the ids to
   `order.assets`, and — when any attach — promotes the order to `in_production` (skipping the
   `awaiting_assets` limbo and fixing the contradictory `paid`-status copy).
4. The post-checkout dashboard uploader remains for adding/replacing photos later.

## Alternatives considered
- **A `pendingUploads` token + collection** (mint a claim token at configure time, store
  uploads against it, redeem in the webhook). More moving parts and a new collection; the
  metadata approach needs none and the 6-cap keeps the value well under Stripe's limit.

## Trade-offs / risks (accepted for MVP)
- **Anonymous uploads.** The token route has no auth (there is no account yet). Abuse is
  bounded by image-only + 15 MB + `configurator/` prefix + random suffix + the daily prune
  cron — but it is **not rate-limited**. Revisit (a soft per-IP limit or a lightweight
  challenge) if abuse appears post-launch.
- **Abandoned blobs.** Photos uploaded but never checked out are orphaned. A daily cron
  (`app/api/cron/prune-blobs`, `vercel.json`, `CRON_SECRET`) deletes `configurator/*` blobs
  older than 24h that no media doc references. Folds the configurator slice of
  `orphaned-blobs-no-cleanup` (studio video orphans still open).
- **All-blobs-404 edge.** If every `assetPaths` blob is gone at webhook time, 0 attach and the
  order stays `paid` (no false `in_production`).

## Verification
Pure seams are unit-tested (checkout metadata in `tests/lib/checkout.test.ts`; webhook attach
with a mocked `head()` in `tests/stripe/webhook.test.ts`). The real `clientUploads` + cron
end-to-end requires the **staging Vercel env** (real Blob) — deferred there, driven via the
agent order-tooling MCP.
