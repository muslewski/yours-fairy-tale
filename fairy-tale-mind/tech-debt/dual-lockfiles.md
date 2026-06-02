---
type: debt
summary: "Both package-lock.json and pnpm-lock.yaml are committed; pick one package manager."
tags: [dx]
status: open
created: 2026-06-02
updated: 2026-06-02
related: []
sources: []
severity: low
effort: low
---

## Problem
The repository contains both `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm).
Having two lockfiles from different package managers creates ambiguity about which
tool CI and contributors should use. The lockfiles may also diverge, leading to
inconsistent installs across environments.

## Fix
Decide on one package manager (npm or pnpm), delete the other lockfile, add a
`.npmrc` or `packageManager` field to `package.json` to make the choice explicit,
and update any install instructions or CI scripts accordingly.
