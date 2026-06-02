# The Mind — repository knowledge system for Yours Fairy Tale

**Date:** 2026-06-02
**Status:** Approved (design), ready for implementation plan
**Origin prompt:** "Set up 'the Mind' in THIS repository — a repository knowledge system that makes the codebase agent-native and human-queryable." (Full recipe captured in the genesis decision record during implementation.)

## Knobs (filled)

- **VAULT:** `fairy-tale-mind/`
- **FIELD:** Personalized, hand-animated fairy-tale *videos* starring a customer's child — parents pick an adventure, a length, and a level of detail. (Product pivoted from hardcover books to animated videos; `app/layout.tsx` metadata reflects videos, CLAUDE.md still says books — recorded as a decision + tech-debt.)
- **STACK:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4. No test framework (intentional). Check gate = `next build` (typecheck + lint + compile). Generator = Node ESM (`.mjs`) using `gray-matter` (already a dependency — no new deps).

## Philosophy (unchanged from the recipe)

`fairy-tale-mind/` is the single source of truth for understanding the system.
Everything in `.claude/` is a **projection** (derived) or **pointer** (into the vault) —
never a copy. It is an Obsidian vault: YAML frontmatter = properties, `[[wikilinks]]`
connect notes, `sources:` = lineage, `related:` = lateral links.

Two kinds of knowledge, never conflated:

| THE MAP (`map/`) | THE LEDGER (`specs/ plans/ ideas/ tech-debt/`) |
|---|---|
| PRESENT — what IS | PAST — how/why we decided & built it |
| mutable, tracks the code | read-only once consumed (supersede, don't edit) |
| what / where / how now | why / what we intended / how we got here |

Lineage joins them: `prompt → idea → spec → plan → [implementation] → zone card / decision`.

Resolution ladder: `map/index.md` (TOC) → `map/zones/<slug>.md` (the hinge) → the code →
`map/decisions/` (ADRs).

## Vault structure

```
fairy-tale-mind/
  map/{zones,decisions,flows,entities}/   # the Map
  specs/  plans/  ideas/  tech-debt/        # the Ledger
  templates/                                # one template per note type
  README.md                                 # the property schema (below)
  .obsidian/                                # shared config committed; workspace*.json ignored
```

## Property schema

**Universal frontmatter (all types):**
```yaml
type: zone        # zone | entity | flow | decision | spec | plan | idea | debt
summary: "1–3 sentence human glance."
tags: []
status: active    # per-type lifecycle
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []       # lateral [[wikilinks]]
sources: []       # lineage [[wikilinks]]
```

**Per-type extras:**
- `zone` → `owns: { routes, anchors, globs }`, `depends: [[..]]`, `invariants: [{ rule, enforcedBy: [..] }]`, `verifiedAt: <commit-SHA | "">`
- `entity` → `anchor`, `intent` (opt-in, load-bearing only)
- `flow` → `steps: ["id:<x>","route:<p>",..]`, `verify`, `e2e: [[file]]`
- `decision` → `decided: YYYY-MM-DD`, `supersededBy: [[id]]`
- `spec` → `origin: "<seeding prompt>"`
- `plan` → `implements: [[spec]]`, `produced: [[..]]`
- `idea` → `maturity: seed|budding|evergreen`
- `debt` → `severity: low|med|high|critical`, `effort: low|med|high`

**Lifecycle:** spec `draft→planned→superseded`; plan `draft→executing→done→abandoned`;
debt `open→done→wontfix`; idea `active→promoted→archived`;
zone/flow/entity/decision `active→unmounted` (tombstone, never delete).

## Anchor model (what the generator verifies)

Three anchor kinds, all greppable in this repo:
- **globs** — primary; each must match ≥1 tracked file (`git ls-files -- <glob>`).
- **`id:<name>`** — greps `id="<name>"` in `app/`+`components/` (in-page section anchors: `build`, `collections`, `faq`, `series`, `waitlist`, `top`).
- **`route:<path>`** — resolves to an `app/**/page.tsx` or `route.ts` (`/`, `/series`, `/blog`, `/blog/[slug]`, `/blog/rss.xml`, `/legacy-examples`, `/1-magic-sparkle`…`/10-floating-3d`).

## Zones (11)

| Zone | globs | anchors | depends | essence |
|------|-------|---------|---------|---------|
| `homepage` | `app/page.tsx`, `components/home/hero.tsx`, `components/home/categories.tsx`, `components/home/cta-banner.tsx`, `components/home/faq.tsx`, `components/home/series-teaser.tsx`, `components/DotField.*` | `route:/`, `id:top`, `id:collections`, `id:faq` | `configurator`, `app-shell`, `section-waves` | Live marketing homepage |
| `configurator` | `components/home/configurator.tsx` | `id:build` | `checkout` | Video builder; conversion core |
| `app-shell` | `app/layout.tsx`, `app/series/layout.tsx`, `app/blog/layout.tsx`, `components/home/site-nav.tsx`, `components/home/site-footer.tsx` | — | `site-preloader`, `section-waves` | Nav, footer, root layout, fonts |
| `site-preloader` | `components/site-preloader.tsx`, `components/react-bits/preloader.tsx` | — | — | First-visit curtain splash |
| `section-waves` | `components/home/section-wave.tsx` | — | `design-system` | Wave dividers convention |
| `series` | `app/series/page.tsx`, `components/series/*` | `route:/series`, `id:series`, `id:waitlist` | `app-shell` | The Series subpage + waitlist |
| `journal` | `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, `app/blog/rss.xml/route.ts`, `components/blog/*`, `lib/blog.ts` | `route:/blog` | `app-shell`, `design-system` | The blog ("Journal") |
| `checkout` | `components/checkout/*` | — | — | **Mock** Stripe checkout |
| `design-system` | `app/globals.css`, `lib/variants.ts`, `lib/utils.ts`, `components/motion/*` | — | — | Tokens, motion, comic shadows |
| `legacy-examples` | `app/legacy-examples/page.tsx`, `app/1-magic-sparkle/*`, `app/2-bento-grid/*`, `app/3-glass-dream/*`, `app/4-storybook-editorial/*`, `app/5-aurora-mesh/*`, `app/6-pop-comic/*`, `app/7-cloud-castle/*`, `app/8-neumorph-pastel/*`, `app/9-sticker-sheet/*`, `app/10-floating-3d/*` | `route:/legacy-examples` | — | 10 frozen concept pages (archive) |
| `the-mind` | `scripts/mind/*`, `.claude/commands/map-sync.md`, `.claude/settings.json` | — | — | The Mind itself — **owns its scripts, NOT the vault markdown** (self-stale trap) |

Each zone card: accurate `summary`, `owns`, `depends`, `invariants` (with `enforcedBy`),
`verifiedAt` = HEAD SHA at authoring. Notable per-zone invariants:
- `checkout`: "Never makes network calls or charges money — simulation only." (enforcedBy: none yet → verification gap → seed tech-debt.)
- `design-system`: "Never hardcode hex — use brand tokens / CSS vars." (enforcedBy: `[[skill:brand-voice]]`, `[[skill:section-waves]]`.)
- `site-preloader`: "Reduced-motion users see no flash." (enforcedBy: `motion-reduce:hidden` CSS.)
- `section-waves`: "Footer owns its own entry wave." (enforcedBy: `[[skill:section-waves]]`.)

## Generator — `scripts/mind/generate.mjs`

Node ESM. Contract:
1. Read every `map/zones/*.md` (`type: zone`) and `map/flows/*.md` via `gray-matter`.
2. For each zone, verify anchors resolve: every glob matches ≥1 tracked file (`git ls-files`); every `id:`/`route:` resolves in code → **hard error** if not.
3. Freshness: stale if `git rev-list <verifiedAt>..HEAD -- <globs>` is non-empty, or `verifiedAt == ""`. Mark "⚠ stale" in the index (not an error).
4. Invariants: any invariant with empty `enforcedBy` → report as a verification gap (suggest filing tech-debt).
5. Flows: every step anchor must resolve → hard error if not.
6. Write `map/index.md`: "generated — do not hand-edit" banner; table (Zone | Status | Freshness | Summary) sorted; `## ⚠ Verification gaps`; `## Attic` (unmounted/tombstoned zones).
7. Exit non-zero on any hard error.

**Gating:** add `"mind": "node scripts/mind/generate.mjs"` and `"prebuild": "node scripts/mind/generate.mjs"` to `package.json` scripts, so `npm run build` runs the generator first and fails loudly on drift. (Stale = warning, not failure; broken anchor/glob/flow = failure.)

## Status hook — `scripts/mind/status.mjs`

Pure file I/O (no exec). Reads `map/index.md` (or counts `map/zones/*.md` minus tombstones
and `tech-debt/*.md` with `status: open`) and prints, e.g.:
`🧠 Mind: 11 zones · 5 open tech-debt — orient via fairy-tale-mind/map/index.md before coding.`
Registered in `.claude/settings.json`:
```json
{ "hooks": { "SessionStart": [ { "hooks": [ { "type": "command", "command": "node scripts/mind/status.mjs" } ] } ] } }
```

## Seed the Ledger

- **Migrate** every `docs/superpowers/{specs,plans}` file into
  `fairy-tale-mind/{specs,plans}/` with full frontmatter (`type`, `summary`, `status`,
  `origin`/`implements`, lineage) — the 8 prior ones plus this Mind genesis spec and its
  plan (10 files total). Status: consumed specs → `planned` (read-only), done plans →
  `done`; the Mind spec/plan flip to `planned`/`done` as the Mind itself lands. Then
  remove the now-empty `docs/superpowers/` tree.
- **Decision records** (`map/decisions/`):
  - `pivot-to-animated-videos` — books → videos (sources: video-product-switch spec/plan).
  - `checkout-is-a-simulation` — mock only, no Stripe network calls.
  - `preloader-once-per-session` — SSR-visible, session-gated, reduced-motion via CSS.
  - `footer-owns-its-wave` — the section-wave footer convention.
  - `no-test-harness-by-design` — verification is `next build` + browser; the Mind generator is the new automated gate.
- **Tech-debt** (`tech-debt/`):
  - `claude-md-says-hardcover` (med) — CLAUDE.md framing stale post-pivot.
  - `dual-lockfiles` (low) — both `package-lock.json` and `pnpm-lock.yaml` present.
  - `footer-dead-links` (low/med) — footer socials use `href="#"` (violates the nav rule).
  - `dotfield-hydration-mismatch` (med) — random SVG gradient id → SSR/client mismatch.
  - `checkout-readme-stale` (low) — example still references "Hardcover".

## Projections (pointers, never copies)

- **CLAUDE.md** — add the **Mind-first dev rule** (highest priority): orient via
  `fairy-tale-mind/map/index.md` → zone card → trace `sources` before working; on finish,
  update touched zone cards, re-stamp `verifiedAt` to HEAD, add decision records for
  non-obvious "why", file tech-debt for deferrals, run the generator, commit `index.md`.
  Plus the **pipeline override**: brainstorming output → `fairy-tale-mind/specs/`,
  writing-plans output → `fairy-tale-mind/plans/`.
- **`navigating-fairy-tale` skill** (`.claude/skills/navigating-fairy-tale/SKILL.md`) — a thin
  entry-ramp pointing to `index.md`, the zone cards, and CLAUDE.md conventions. Must NOT
  duplicate the Map.
- **`/map-sync` command** (`.claude/commands/map-sync.md`) — rebuild + validate the index;
  report stale zones and verification gaps.

## Living convention (three-phase loop)

1. **Intent** — brainstorming → `fairy-tale-mind/specs/`; writing-plans → `fairy-tale-mind/plans/`; capture the seeding prompt in the spec's `origin`.
2. **Implementation** — execute the plan; write/update zone cards & decision records as code lands.
3. **Recollection** — flip plan → `done` + fill `produced`; update zone cards; re-stamp `verifiedAt`; add decisions; file tech-debt; run generator; commit `index.md`.

## Self-check before done

- [ ] generator runs green and gates `npm run build` (via `prebuild`)
- [ ] `index.md` lists every zone; every zone's globs/anchors resolve in code
- [ ] the `the-mind` zone owns its **scripts**, not the vault markdown (not perpetually stale)
- [ ] CLAUDE.md carries the Mind-first rule + pipeline override
- [ ] the SessionStart status hook prints on a fresh session
- [ ] no copies: skills/CLAUDE.md point INTO the Mind
- [ ] Map (present) and Ledger (past) never conflated; tombstone, don't delete
- [ ] `docs/superpowers/` migrated and removed

## Out of scope (YAGNI)

- No Obsidian plugins or graph tooling beyond a committed `.obsidian` config.
- No new runtime dependencies (generator uses the existing `gray-matter` + Node + git).
- No CI provider setup (no `.github/workflows`); the gate is the local `prebuild`.
- Concept/legacy pages stay frozen — documented as a zone, not refactored.
