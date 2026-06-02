---
type: decision
summary: "The footer renders its own cream→navy SectionWave, so every page using SiteFooter gets the transition for free."
tags: [design]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[section-waves]]", "[[app-shell]]"]
sources: ["[[2026-06-02-section-waves-design]]"]
decided: 2026-06-02
supersededBy: ""
---

## Context
When section-divider waves were introduced, a decision was needed about who owns
the wave that transitions into the footer — the page layout or the footer component
itself. Without a clear owner, pages might forget to add the pre-footer wave and
the footer would abruptly switch from whatever color precedes it to navy.

## Decision
`SiteFooter` renders its own entry wave at the top of the component. The wave
transitions from cream (or whichever color the `waveFrom` prop specifies) to the
footer's navy background. Pages do not add a manual pre-footer wave.

## Why
Encapsulating the wave inside `SiteFooter` means any page that uses the footer
automatically gets the correct seam color transition. It's one less thing for page
authors to remember and eliminates a whole category of "forgot the footer wave" bugs.

## Consequences
If a page ends in a section that is not cream-colored, it must pass the correct
`waveFrom` prop to `SiteFooter`; otherwise the wave will show the wrong source
color. This is an explicit, visible API contract rather than a silent assumption.
