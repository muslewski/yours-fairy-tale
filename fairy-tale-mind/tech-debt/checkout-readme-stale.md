---
type: debt
summary: "components/checkout/README.md example still references 'Hardcover' after the video pivot."
tags: [docs]
status: resolved
created: 2026-06-02
updated: 2026-06-10
related: ["[[checkout]]", "[[pivot-to-animated-videos]]"]
sources: []
severity: low
effort: low
---

## Resolved 2026-06-10
The launch-hardening docs pass fixed the `components/checkout/README.md` example —
the cart item now reads "Personalized video" instead of the old Hardcover line,
matching the post-pivot product.

## Problem
`components/checkout/README.md` contains example copy and/or product descriptions
that reference "Hardcover" or storybook framing. After the pivot to personalized
animated videos (`[[pivot-to-animated-videos]]`), this README is out of date and
could mislead future contributors about what the checkout flow is selling.

## Fix
Update `components/checkout/README.md` to replace any "Hardcover" or storybook
references with video-framing language consistent with the current product.
