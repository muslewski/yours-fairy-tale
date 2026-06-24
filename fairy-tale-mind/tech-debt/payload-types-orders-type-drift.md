---
type: debt
summary: "A fresh `payload generate:types` produces a payload-types.ts that no longer typechecks against the orders/webhook/video code: ~9 errors (Order→Record<string,unknown> casts lack an index signature; payload.create({collection:'orders'}) hits the stricter create-Options union). The repo gets away with it because payload-types.ts is never committed and a stale local copy + withPayload's build-time generation mask the drift."
tags: [payload, types, orders, tech-debt]
status: open
created: 2026-06-24
updated: 2026-06-24
related: ["[[cms-pages]]", "[[2026-06-24-payload-type-generation-workaround]]", "[[payload-backend]]", "[[checkout]]"]
sources: []
severity: low
effort: medium
---

## What surfaced
While building CMS pages we got Payload type generation working again (see
`[[2026-06-24-payload-type-generation-workaround]]`). Running it revealed that the
current Payload 3.85 type generation is STRICTER than the stale `payload-types.ts`
the repo has relied on, and the existing money-path code does not compile against it:

- `lib/video-access.ts` + `app/(site)/(app)/app/orders/[id]/page.tsx`: `Order` cast
  to `Record<string, unknown>` fails (generated `Order` has no index signature).
- `app/api/stripe/webhook/route.ts` + a couple of tests: `payload.create/update(
  { collection: "orders", ... })` is rejected by the stricter create-Options union
  (`DraftDataFromCollectionSlug` / missing `draft`).

These are pre-existing on `main` (reproduced on a clean `main` with no
`payload-types.ts`); they are NOT introduced by the Pages feature, which avoids the
issue entirely by using `lib/pages-types.ts` and never importing `@/payload-types`.

## Why it's deferred
Fixing it means editing the Stripe webhook / orders / video-access money-path files
(adding `draft: false` / casts / explicit types) — out of scope for the CMS-pages
sub-project and risky to touch without its own review. The site builds and deploys
today because `payload-types.ts` is not committed and `withPayload` regenerates a
consistent-enough file at build.

## How to apply (later)
Commit a freshly generated `payload-types.ts`, then fix the ~9 call sites (prefer
explicit typed results over `as Record<string, unknown>`, and add the discriminating
field on orders create/update), and add `npm run generate:types` to CI before the
typecheck step so drift is caught going forward.
