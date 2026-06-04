---
type: zone
summary: "Nav, footer, root layout and fonts — the chrome wrapping every page."
tags: [infrastructure, layout]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[site-preloader]]", "[[section-waves]]", "[[auth-gating]]"]
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "app/layout.tsx"
    - "app/series/layout.tsx"
    - "app/blog/layout.tsx"
    - "components/home/site-nav.tsx"
    - "components/home/site-footer.tsx"
    - "components/motion/stagger.tsx"
    - "app/(app)/sign-in/layout.tsx"
    - "app/manifest.json"
    - "app/favicon.ico"
    - "app/icon0.svg"
    - "app/icon1.png"
    - "app/apple-icon.png"
    - "app/opengraph-image.tsx"
    - "app/twitter-image.tsx"
    - "lib/og.tsx"
    - "assets/Fredoka-400.woff"
    - "assets/Fredoka-600.woff"
depends: ["[[site-preloader]]", "[[section-waves]]"]
invariants:
  - rule: "Internal navigation uses next/link (client-side, no full reload) — never raw <a>/motion.a for in-app routes. Animated links wrap Link via motion.create(Link); StaggerItem supports as=\"link\"."
    enforcedBy: []
  - rule: "Social/OG images are generated via next/og (lib/og.tsx) using the Fredoka woff bundled in assets/, inlining brand PNGs as data URIs so generation needs no network and stays statically optimized. og:image/twitter:image come from the opengraph-image/twitter-image file conventions, NOT from metadata.images (avoid duplicates)."
    enforcedBy: []
verifiedAt: 230939e
---

## Purpose
The root layout (`app/layout.tsx`) registers fonts and wraps all pages with
`[[site-preloader]]` — it does NOT mount the nav/footer. Each page/route that wants the
marketing chrome mounts `<SiteNav/>` + `<SiteFooter/>` itself: the homepage (`app/page.tsx`)
directly, and `/series`, `/blog`, `/sign-in`, AND the gated `/app` dashboard via their own
layouts. `/sign-in` has its own layout (rather than one on the shared `(app)` route group)
so the `/app` gate can never trap it.

The nav's right cluster holds two buttons. The first is **Sign in** (white, outlined →
`/sign-in`) on public pages, but flips to **My account** (→ `/app/profile`) when
`<SiteNav signedIn />` is rendered — the gated `/app` layout passes `signedIn` so a
logged-in customer never sees "Sign in". The second is the primary **Start** CTA (pink →
`#build`), shown in both states (a returning customer can order another video). Both stay
visible on mobile even though the center links collapse, since this nav has no hamburger
menu.

All internal nav uses **client-side `next/link`** (no full page reload). The animated nav
buttons (logo, Sign in, Start) are `motion.create(Link)`; the center links use the
`StaggerItem as="link"` variant (`components/motion/stagger.tsx`). Pure same-page fragment
links (`#build`, `#collections` with no leading slash) stay as plain anchors — they're
browser scrolls, not navigations.

## Lineage
Seeded from the existing site at Mind setup.
Nav converted from raw `<a>`/`motion.a` to `next/link` for client-side navigation
(2026-06-04).
Footer Support → "Contact us" link repointed from a dead `/#top` to the real `/contact`
route (2026-06-04, see `[[contact]]`).
Footer repositioned to videos + AI-crafted, dropped 'made by hand' (2026-06-04).
Branded favicons + web manifest installed (Next 16 file conventions), full social
metadata (metadataBase → www canonical, openGraph, twitter, appleWebApp title,
theme-color), and dynamic next/og social images added (site-wide + per Journal post)
(2026-06-04, see `[[branded-og-and-favicons]]`).
The gated `/app` dashboard now wears the public chrome too: its layout mounts
`<SiteNav signedIn />` ("My account" instead of "Sign in") + `<SiteFooter/>`, and the
dashboard/profile pages became content-only (2026-06-04).
