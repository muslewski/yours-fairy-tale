---
type: debt
summary: "The privacy, terms, and refund pages are solid drafts but contain bracketed placeholders ([registered business name and address], [your governing jurisdiction]) and have not had legal review. They are live and linked in the footer."
tags: [legal, compliance, content]
status: open
created: 2026-06-05
updated: 2026-06-05
related: ["[[app-shell]]"]
sources: []
severity: medium
effort: low
---

## Problem
`app/(legal)/{privacy,terms,refund}/page.tsx` were authored as professional drafts
tailored to the personalized-video product (Stripe payments, uploaded child photos,
proof/revision flow). They are live and linked in the footer, but:

- They contain visible bracketed placeholders that must be filled with real values:
  - `[registered business name and address]` — in privacy and terms.
  - `[your governing jurisdiction]` — in terms (governing law).
- They have NOT been reviewed by a lawyer. Because the product collects children's
  photos and takes payments, the privacy/consumer terms carry real compliance
  weight (e.g. GDPR, children's data, distance-selling/refund rules).

## Fix
1. Replace the bracketed placeholders with the real legal entity, registered
   address, and governing jurisdiction.
2. Have a qualified lawyer review all three policies before relying on them,
   especially the handling of children's photos and the refund terms for a
   personalized digital product.
3. Update the "Last updated" date when finalized.
