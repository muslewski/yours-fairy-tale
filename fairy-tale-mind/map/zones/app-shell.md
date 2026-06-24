---
type: zone
summary: "Nav, footer, root layout and fonts — the chrome wrapping every page. Also owns the site-wide error/404 boundaries, sitemap/robots, security headers, and the legal pages (privacy/terms/refund)."
tags: [infrastructure, layout]
status: active
created: 2026-06-02
updated: 2026-06-15
related: ["[[site-preloader]]", "[[section-waves]]", "[[auth-gating]]", "[[cms-pages]]"]
sources: []
owns:
  routes: []
  anchors: []
  globs:
    - "app/(site)/layout.tsx"
    - "app/(site)/series/layout.tsx"
    - "app/(site)/blog/layout.tsx"
    - "components/home/site-nav.tsx"
    - "components/home/site-footer.tsx"
    - "app/(site)/error.tsx"
    - "app/global-error.tsx"
    - "app/(site)/not-found.tsx"
    - "app/sitemap.ts"
    - "app/robots.ts"
    - "next.config.ts"
    - "app/(site)/(legal)/layout.tsx"
    - "app/(site)/(legal)/privacy/page.tsx"
    - "app/(site)/(legal)/terms/page.tsx"
    - "app/(site)/(legal)/refund/page.tsx"
    - "components/legal/legal-page.tsx"
    - "components/motion/stagger.tsx"
    - "app/(site)/(app)/sign-in/layout.tsx"
    - "app/manifest.json"
    - "app/favicon.ico"
    - "app/icon0.svg"
    - "app/icon1.png"
    - "app/apple-icon.png"
    - "app/(site)/opengraph-image.tsx"
    - "app/(site)/twitter-image.tsx"
    - "lib/og.tsx"
    - "assets/Fredoka-400.woff"
    - "assets/Fredoka-600.woff"
depends: ["[[site-preloader]]", "[[section-waves]]"]
invariants:
  - rule: "Internal navigation uses next/link (client-side, no full reload) — never raw <a>/motion.a for in-app routes. Animated links wrap Link via motion.create(Link); StaggerItem supports as=\"link\"."
    enforcedBy: []
  - rule: "Social/OG images are generated via next/og (lib/og.tsx) using the Fredoka woff bundled in assets/, inlining brand PNGs as data URIs so generation needs no network and stays statically optimized. og:image/twitter:image come from the opengraph-image/twitter-image file conventions, NOT from metadata.images (avoid duplicates)."
    enforcedBy: []
  - rule: "Footer social icons link to the REAL profiles (Instagram, Facebook, TikTok — yoursfairytale7), open in a new tab with rel='noopener noreferrer', and announce the new-tab behavior to assistive tech. Never href='#'."
    enforcedBy: []
verifiedAt: 1619367
---

## Purpose
The root layout (`app/(site)/layout.tsx`) registers fonts and wraps all pages with
`[[site-preloader]]` — it does NOT mount the nav/footer. Each page/route that wants the
marketing chrome mounts `<SiteNav/>` + `<SiteFooter/>` itself: the homepage (`app/(site)/page.tsx`)
directly, and `/series`, `/blog`, `/sign-in`, AND the gated `/app` dashboard via their own
layouts. `/sign-in` has its own layout (rather than one on the shared `(app)` route group)
so the `/app` gate can never trap it.

The nav's right cluster holds two buttons. The first is **Sign in** (white, outlined →
`/sign-in`), which flips to **My account** (→ `/app/profile`) for a logged-in customer. The
signed-in check is **client-side**: `SiteNav` reads `authClient.useSession()`, so the static
public pages (homepage, series, blog, contact, sign-in) show the right button for a logged-in
visitor without becoming dynamically rendered. An optional `signedIn` prop overrides the hook;
the gated `/app` layout passes `<SiteNav signedIn />` so behind the gate the correct state
shows on first paint with no flash. On a cold public-page load the initial HTML shows "Sign
in" until the session resolves (in-app client navigation has the session cached, so no flash).
The second button is the primary **Start** CTA (pink → `#build`), shown in both states (a
returning customer can order another video). Both stay visible on mobile even though the
center links collapse, since this nav has no hamburger menu.

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
Nav signed-in state moved from a per-route prop (which hardcoded `false` on every public
page, so a logged-in visitor saw "Sign in" on the homepage) to a client-side
`authClient.useSession()` check, keeping public pages static; the `signedIn` prop remains as
an override for the gated `/app` layout (2026-06-05).
Trust/quality pass (2026-06-05): branded `error.tsx` / `global-error.tsx` / `not-found.tsx`
(brand voice, error digest shown as a support reference); SEO `sitemap.ts` + `robots.ts`;
baseline security headers + `poweredByHeader: false` in `next.config.ts`; and the legal
pages (privacy, terms, refund) under a shared `(legal)` route group, linked in the footer
bottom bar. Pre-launch (2026-06-15): the bracketed placeholders are now filled with the
real registered entity (Firma Dominik Jaworski AI, NIP 5543048002, REGON 544985902,
ul. Nad Stawem 4, 86-005 Białe Błota, Poland) and governing law (Poland), guarded by
`tests/legal/legal-pages.test.ts`; a qualified-lawyer review of the wording is still
outstanding (see `[[legal-pages-need-entity-and-review]]`).
Launch hardening (2026-06-10): the footer's `href="#"` social placeholders became real
external profile links (Instagram/Facebook/TikTok `yoursfairytale7`, new-tab +
`rel="noopener noreferrer"`, new-tab behavior announced to assistive tech; Facebook
replaced the Pinterest placeholder), closing the `footer-dead-links` debt. `next.config.ts`
gained `experimental.serverActions.bodySizeLimit: "5mb"` for the one-file-per-call photo
uploads (see `[[auth-gating]]`).
Pre-launch acquisition UX (2026-06-15, Phase 2): `site-nav.tsx` gained a mobile hamburger +
slide-out drawer (`md:hidden`, Motion, reduced-motion guarded) exposing the full menu, and
the primary CTA copy changed `Start! ⚡` → `Start` (brand-voice). `site-footer.tsx`: the
newsletter form is now wired to `POST /api/waitlist` (`source=footer`) with sent/error states
instead of a native GET reload; the fabricated "Our story / Reviews / Careers / Gift cards"
links were removed and "Track your order" repointed to `/sign-in` (the real path).
Studio panel (2026-06-10): `app/robots.ts` disallow gained `/studio` — the staff panel
stays out of the index alongside `/app`, `/admin`, `/api`, and `/sign-in` (see
`[[studio]]`).
CMS pages (2026-06-24): `app/sitemap.ts` became async and now appends published
Payload page slugs (tagged `pages-sitemap`, so a publish busts it) to the static
routes. A new dynamic route `app/(site)/[slug]/` renders CMS pages with the shared
nav/footer chrome — owned by `[[cms-pages]]`, not app-shell.
