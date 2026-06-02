---
type: decision
summary: "This repo has no unit-test harness by design; verification is `next build` + browser, plus the Mind generator gate."
tags: [process]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[the-mind]]"]
sources: []
decided: 2026-06-02
supersededBy: ""
---

## Context
Many Next.js projects include vitest, Jest, or Playwright for automated testing.
This repo has none of these. That absence is intentional, not an oversight.

## Decision
No unit-test harness (vitest / Jest / Playwright) is added to this repository.
The verification gate is:
1. `npm run build` — runs TypeScript typecheck, ESLint, and the full Next.js
   compilation. A failing build is a failing check.
2. `npm run mind` — the Mind generator validates zone anchors, freshness, and
   tech-debt counts. Wired as a `prebuild` hook so it runs automatically.
3. Manual browser review for any visual or interaction changes.

## Why
The codebase is primarily UI composition and brand presentation — the kind of
correctness that is hard to unit-test and easy to see in a browser. A test harness
would add maintenance overhead without proportional confidence gains for this
project shape. The build gate catches type errors and lint violations at CI time.

## Consequences
There are no automated regression tests for component behavior or visual output.
Any contributor must manually verify UI changes in the browser before considering
a change done. If the project grows to include logic-heavy backend code or
non-trivial business rules, this decision should be revisited.
