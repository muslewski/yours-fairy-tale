---
type: debt
summary: "Footer social links use href='#', violating the 'every link goes somewhere real' rule."
tags: [ux]
status: resolved
created: 2026-06-02
updated: 2026-06-10
related: ["[[app-shell]]"]
sources: []
severity: med
effort: low
---

## Resolved 2026-06-10
Launch hardening replaced every `href="#"` social placeholder in
`components/home/site-footer.tsx` with the real profiles: Instagram
`https://www.instagram.com/yoursfairytale7/`, Facebook
`https://www.facebook.com/yoursfairytale7/` (replacing the Pinterest placeholder),
and TikTok `https://www.tiktok.com/@yoursfairytale7`. Links open in a new tab with
`rel="noopener noreferrer"` and announce the new-tab behavior to assistive tech.

## Problem
`components/home/site-footer.tsx` contains social media links (e.g. Instagram,
TikTok, Facebook) whose `href` is set to `"#"`. CLAUDE.md explicitly requires that
every CTA and nav link leads somewhere real — a live URL, a route, or a section
anchor. Dead `href="#"` links scroll the user to the top of the page unexpectedly
and are misleading to screen-reader users.

## Fix
Replace each `href="#"` with the real social profile URL (or remove the link if
the profile does not yet exist). If a profile is intentionally unset, render the
icon as a non-interactive `<span>` rather than a dead anchor.
