---
type: debt
summary: "The site nav has a leftover placeholder link labeled \"Matieniatus\" that points at /#top."
tags: [content, nav]
status: resolved
created: 2026-06-02
updated: 2026-06-04
related: ["[[app-shell]]", "[[homepage]]"]
sources: []
severity: low
effort: low
---

## Problem
`components/home/site-nav.tsx` includes a nav item `{ label: "Matieniatus", href: "/#top" }`
— clearly leftover scaffolding/placeholder text. It ships in the live nav between "Home"
and "Fairy Tale" and links nowhere meaningful (just back to `#top`).

## Fix
Replace it with a real nav destination (or remove it). If it was meant to be a real
section/page, add that section with an `id` and point the link at it (per the "every link
goes somewhere real" rule in CLAUDE.md).

## Resolution (2026-06-04)
Removed the "Matieniatus" placeholder item from `NAV` in `site-nav.tsx`. In the same
change the nav "Contact" link was repointed from `/#top` to the real `/contact` route.
