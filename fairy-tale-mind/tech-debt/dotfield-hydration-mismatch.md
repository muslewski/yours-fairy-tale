---
type: debt
summary: "DotField generates a random SVG gradient id, causing a React hydration mismatch on the homepage."
tags: [bug]
status: open
created: 2026-06-02
updated: 2026-06-02
related: ["[[homepage]]"]
sources: []
severity: med
effort: low
---

## Problem
`components/DotField.jsx` generates a random string (e.g. `Math.random()`) at
render time and uses it as an SVG `<linearGradient>` `id`. Because the server
renders a different random id than the client's first render, React throws a
hydration mismatch warning in development and may produce subtle visual glitches
in production (the gradient reference breaks until re-render).

## Fix
Replace the random id with `React.useId()`, which is stable across the
server/client hydration boundary. This requires the component to be a Client
Component (`"use client"`) if it is not already, since `useId` is a React hook.
