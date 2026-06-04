---
type: zone
summary: "The /contact page — a functional Resend-backed contact form, direct channels, support highlights, a contact-oriented mini-FAQ, and a Place-an-order CTA."
tags: [feature, marketing, support]
status: active
created: 2026-06-04
updated: 2026-06-04
related: ["[[app-shell]]", "[[checkout]]", "[[homepage]]"]
sources: ["[[2026-06-04-contact-page-design]]", "[[contact-page]]"]
owns:
  routes: ["/contact"]
  anchors: []
  globs:
    - "app/contact/**"
    - "components/contact/**"
    - "lib/contact.ts"
    - "app/api/contact/route.ts"
    - "tests/contact/**"
    - "e2e/contact.spec.ts"
depends: ["[[app-shell]]", "[[checkout]]"]
invariants:
  - rule: "The contact form is FUNCTIONAL — it POSTs to /api/contact and sends via lib/email.ts (Resend). A hidden honeypot field (company) must stay empty; all validation lives in lib/contact.ts (pure), not in the route or the form."
    enforcedBy: ["tests/contact/contact.test.ts", "tests/contact/route.test.ts", "e2e/contact.spec.ts"]
verifiedAt: b20383d
---

## Purpose
The `/contact` surface where parents reach a real person. A server-component page
(`app/contact/page.tsx`) under a `/series`-style layout (`app/contact/layout.tsx`:
`<SiteNav/>` + cream `<main>` + `<SiteFooter/>`, footer owns its wave) renders the
static content; a `"use client"` `<ContactForm/>` island
(`components/contact/contact-form.tsx`) POSTs JSON to `app/api/contact/route.ts`,
which delegates to `submitContactMessage` in `lib/contact.ts` and sends via the shared
Resend helper (`[[checkout]]` owns `lib/email.ts`). Recipient: `CONTACT_INBOX` env,
default `hello@yoursfairytale.com`; in dev `RESEND_TO_OVERRIDE` redirects all mail safely.

`lib/contact.ts` is the pure core: `validateContactInput` (trim, email shape, length
caps, honeypot reject, topic defaulting to "Something else"), `buildContactEmail`
(HTML-escaped inline-style template, same family as the order email), and
`submitContactMessage`.

Page sections, top → bottom: intro → split card (form + direct channels: mailto, response
time, social badges) → 4 support-highlight cards → contact mini-FAQ (`<dl>`, links to the
homepage `/#faq`) → Place-an-order CTA band (`/#build`).

## Lineage
Created 2026-06-04 (`[[2026-06-04-contact-page-design]]`, plan `[[contact-page]]`), built
subagent-driven across 6 tasks. The footer's Support → "Contact us" link, previously a dead
`/#top`, now points here.
