---
type: decision
summary: "Personalization is photo-based plus a few light details: the parent sends photos for the child's likeness and a few details (name, animal, plot); the value prop leads with photos, 'cinematic', and HD."
tags: [product, positioning]
status: active
created: 2026-06-02
updated: 2026-06-02
related: ["[[product]]", "[[homepage]]", "[[configurator]]"]
sources: []
decided: 2026-06-02
supersededBy: ""
---

## Context
The site originally framed personalization as form-based: *"Tell us their name, their
curls, their favorite animal."* A description, not a likeness. Feedback (relayed by the
owner from a friend reviewing the live site) proposed a stronger frame: *"You send us a few
photos and we transform your child into the hero of a personalized cinematic fairy tale,"*
plus "Personalized" / "In HD" badges and a configurator subtext *"Choose one of the ready
plots or create your own."*

## Decision
Personalize from a few **uploaded photos** (for the child's actual likeness) **plus** a few
light details (name, favorite animal, a plot). The copy **leads with photos** and elevates
the output as **cinematic** and **in HD**. The configurator frames story choice as **a
ready plot or a custom one**.

## Why
Photo-based likeness is a more believable, more emotional promise than a name/description,
and it matches how AI character-video products actually work. "Cinematic" and "HD" lift the
perceived quality from "a clip" to "a film." "Ready plot or your own" makes the
configurator's job legible.

## Consequences
- Hero subcopy, hero badges ("In HD", "Personalized"), and the configurator subtext updated
  (see `[[homepage]]`, `[[configurator]]`).
- The `[[product]]` brief updated to describe photos + details.
- **Follow-up (not yet done):** the FAQ *"How do you use my child's details?"* should be
  extended to address **photos and privacy**, now that photos are core. Worth filing as
  tech-debt if not picked up soon.
- This is positioning for a design-forward prototype; the flow does not yet actually accept
  photo uploads (`[[checkout-is-a-simulation]]` — the whole funnel is a simulation today).
