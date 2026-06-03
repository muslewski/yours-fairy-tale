---
type: decision
title: "Proxy is presence-only (no DB); layout is the authoritative check"
date: 2026-06-03
status: active
tags: [auth, security, performance]
related: ["[[auth-gating]]"]
---

## Context
Two approaches for gating `/app/*`:
1. Single authoritative check (DB hit) in every request via the proxy.
2. Two-layer: optimistic presence-only check in proxy + authoritative DB check in layout.

## Decision
We use the two-layer model, matching the `better-auth-with-payload` skill and the delieta reference.

The proxy (`proxy.ts`) calls `getSessionCookie(request)` — a synchronous read of the request's `Cookie` header — and redirects if absent. No DB hit, no async. This handles the most common case (definitely-unauthenticated) at near-zero cost.

The layout (`app/(app)/app/layout.tsx`) calls `auth.api.getSession({ headers })` against the DB. This catches stale / expired tokens that slipped past the proxy.

## Rationale
- Keeping the proxy DB-free respects the Next 16 docs advice ("Proxy is not a full session management or authorization solution") and enables CDN-edge execution.
- The layout is the real boundary. All customer data reads are additionally scoped by owner id (`getOrdersForOwner`), so even a session that slips through is constrained.

## Alternatives considered
- Single DB check in proxy only: makes proxy expensive and couples it to the DB.
- Single DB check in layout only (no proxy): works but sends unauthenticated users to /app, loading the layout, before redirecting — perceptibly slower.
