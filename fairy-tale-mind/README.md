# fairy-tale-mind — the Mind

Single source of truth for understanding this repo. An Obsidian vault: YAML
frontmatter = properties, `[[wikilinks]]` connect notes. Everything in `.claude/`
is a projection or pointer into here — never a copy.

## Map vs Ledger
- **Map** (`map/`) — PRESENT tense: what IS. Mutable, tracks the code.
- **Ledger** (`specs/ plans/ ideas/ tech-debt/`) — PAST tense: why/how we decided
  & built it. Read-only once consumed — **supersede, don't edit; tombstone, don't delete.**

Lineage joins them: `prompt → idea → spec → plan → [implementation] → zone card / decision`.
Read the cheapest note that answers the question: `map/index.md` → `map/zones/<slug>.md`
→ the code → `map/decisions/`.

## Universal frontmatter (every note)
```yaml
type: zone        # zone | entity | flow | decision | spec | plan | idea | debt | brief
summary: "1–3 sentence human glance."
tags: []
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []       # lateral [[wikilinks]]
sources: []       # lineage [[wikilinks]]
```

## Per-type extras
- **zone** → `owns: { routes, anchors, globs }`, `depends`, `invariants: [{rule, enforcedBy}]`, `verifiedAt`
- **entity** → `anchor`, `intent`
- **flow** → `steps`, `verify`, `e2e`
- **decision** → `decided`, `supersededBy`
- **spec** → `origin`
- **plan** → `implements`, `produced`
- **idea** → `maturity`
- **debt** → `severity`, `effort`
- **brief** → no extras (universal only). The product north-star: what we're building and why. Read it first to orient. Lives at `map/product.md`.

## Lifecycle (status)
- spec: `draft → planned → superseded`
- plan: `draft → executing → done → abandoned`
- debt: `open → done → wontfix`
- idea: `active → promoted → archived`
- zone/flow/entity/decision: `active → unmounted` (tombstone)

## Anchors (verified by scripts/mind/generate.mjs)
- `globs` — primary; each must match ≥1 tracked file.
- `id:<name>` — greps `id="<name>"` in app/+components.
- `route:<path>` — resolves to an `app/**/page.tsx|route.ts`.

Do not hand-edit `map/index.md` — it is generated. Run `npm run mind` (or `/map-sync`).

## Dashboards
Live, frontmatter-driven views over the structured corpus (open in Obsidian; require the
**Bases** core plugin). They aggregate the `type:`-tagged notes and **complement** the
code-verifying generator — they never replace it, and live in `bases/` (outside `map/` and
every generator glob).

- [[ledger.base]] — tech-debt board · decisions log · spec → plan pipeline · briefs
- [[map.base]] — zone atlas (grouped by status)
