---
type: debt
summary: "Placeholders are now FILLED (real entity + governing law, 2026-06-15). Remaining open item: the privacy/terms/refund wording has not had a qualified-lawyer review, which carries real weight because the product collects children's photos and takes payments."
tags: [legal, compliance, content]
status: open
created: 2026-06-05
updated: 2026-06-15
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

## Progress (2026-06-15, Phase-1 Task 1)
Step 1 DONE: the bracketed placeholders are filled with the real entity — **Firma
Dominik Jaworski AI** (NIP 5543048002, REGON 544985902), ul. Nad Stawem 4, 86-005
Białe Błota, Poland — in `privacy/page.tsx` and `terms/page.tsx`, and governing law
set to **Poland**. A guard test (`tests/legal/legal-pages.test.ts`) now fails the
build if any `[registered business name…]` / `[your governing…]` placeholder
reappears. `refund/page.tsx` had no entity placeholder.

## Fix (remaining)
1. ~~Replace the bracketed placeholders~~ — DONE (see above).
2. Have a qualified lawyer review all three policies before relying on them,
   especially the handling of children's photos and the refund terms for a
   personalized digital product. **← this is why the note stays open.**
3. Update the "Last updated" date on the pages when the wording is finalized after
   that review.
