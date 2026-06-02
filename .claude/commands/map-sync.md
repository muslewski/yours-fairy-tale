---
description: Rebuild and validate the Mind index; report stale zones and verification gaps.
---

Run the Mind generator and report the result.

1. Run: `npm run mind`
2. If it exits non-zero, surface each `✖` hard error (broken glob/anchor/flow) and stop —
   these fail the build. Propose the fix (correct the zone card's globs/anchors, or update
   the code) but do not guess silently.
3. If it exits 0, read `fairy-tale-mind/map/index.md` and report: zone count, any `⚠ stale`
   zones (their globs changed since `verifiedAt` — re-verify against code and re-stamp), and
   the "⚠ Verification gaps" list (invariants with no `enforcedBy` — consider filing tech-debt).
4. If `map/index.md` changed, commit it: `git add fairy-tale-mind/map/index.md && git commit -m "map-sync: rebuild index"`.
