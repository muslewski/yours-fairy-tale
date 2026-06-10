---
type: debt
summary: "The fail-closed boot guarantee is UNVERIFIED on the real platform: that an instrumentation.ts register() throw actually fails requests on Vercel must be confirmed on a preview (dummy missing var) before launch — along with Blob head(filename) resolution and an end-to-end photo upload + video playback."
tags: [deployment, verification, vercel]
status: open
created: 2026-06-10
updated: 2026-06-10
related: ["[[payload-backend]]", "[[prod-env-fail-closed]]", "[[blob-pass-through-proxied-video]]"]
sources:
  - "fairy-tale-mind/plans/2026-06-10-launch-hardening.md"
severity: medium
effort: low
---

## Problem
`[[prod-env-fail-closed]]` rests on the assumption that a throw from
`instrumentation.ts` `register()` makes the deploy fail every request. The
launch-hardening reviewer could NOT verify this from the installed Next 16 build
(its dist layout is restructured relative to public docs), and the local sandbox
could not complete a build at all (Turbopack OOM-killed). Until the throw→500
semantics are observed on the real platform, the fail-closed guarantee is a design
intent, not a verified property — and a silently swallowed register() error would
reproduce exactly the half-working-deploy failure mode the guard exists to prevent.

The same deploy gate covers two more platform-only assumptions from the
change-set's deploy checklist:
- **Blob `head(filename)` resolution**: the gated video route assumes pathname ==
  filename (no prefix, no random suffix) — confirm a real upload resolves.
- **End-to-end media flow**: a real photo upload (client re-encode, one file per
  server-action call) and a delivered-video playback (Range seeking, `?download`)
  through the Blob proxy.

## Fix
On a Vercel preview before launch:
1. Deploy with one required var deliberately unset (e.g. a dummy-removed
   `RESEND_FROM`) and confirm every request 500s and the boot error names the
   missing var in the logs. Restore the var; confirm the deploy serves.
2. Upload a photo through the dashboard, attach a `finalVideo` in `/admin`, and
   play + scrub + download it through `/api/orders/[id]/video` with Blob storage
   active.
Record the results here, then close this note (and update
`[[prod-env-fail-closed]]`'s open-gate paragraph).
