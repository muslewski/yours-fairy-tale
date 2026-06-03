---
name: better-auth-with-payload
description: Use when integrating Better Auth with PayloadCMS v3 in a Next.js app — adding customer accounts alongside Payload's native admin panel, bridging Better Auth to Payload's database, or deciding sign-up/session/access-control patterns. Especially before reaching for the payload-auth plugin or making a customer users collection auth:true.
---

# Better Auth with Payload (v3, Next.js)

## Overview
Run **two auth systems on purpose**: Payload **native auth** for staff (the `/admin`
panel) and **Better Auth** for customers (the app/dashboard). Bridge Better Auth to
Payload's database with a **custom adapter built on Better Auth's `createAdapterFactory`**
— *not* the `payload-auth` plugin. Verified reference implementation on this exact stack:
the **delieta** repo (Next 16.2.6 · Payload 3.85 · better-auth 1.6.11).

## When to Use
- Adding customer/end-user accounts to a Payload v3 app that also needs a staff admin panel.
- You're about to `npm i @payload-auth/better-auth-db-adapter` / the `payload-auth` plugin,
  or to make a customer `users` collection `auth: true` — **stop and read this first.**
- Deciding session validation, access control, or sign-up gating for Better Auth + Payload.
- **Not for:** apps where Payload's native auth alone is enough (no separate customer auth).

## The Pattern (5 rules)

1. **Split the systems — separate collections, separate cookies.**
   `auth: true` on **one `admins` collection only** (set it as `admin.user` in
   `payload.config.ts`); it gates `/admin`. Customers live in a **plain `users`
   collection with NO `auth: true`** — Better Auth owns their credentials (hashed password
   on the `accounts` collection). Cookies don't collide: `payload-token` (Payload) vs
   `better-auth.session_token` (BA). Mount BA at **`/api/auth/[...all]`**, *outside* the
   Payload route group.

2. **Bridge with a custom adapter, not a plugin.** Build it on Better Auth's official
   `createAdapterFactory` (`better-auth/adapters`) and route every BA DB op through
   Payload's **Local API**. Payload owns the schema; the `users/accounts/sessions/
   verifications` collections mirror BA's camelCase field names **1:1** (zero translation).
   Critical config: `depth: 0`, `disableIdGeneration: true`, UUID ids, `transaction: false`.

3. **Validate sessions in two layers.** Optimistic **cookie-presence** check in `proxy.ts`
   (Next 16 Proxy) over gated routes → redirect to `/sign-in` if absent (no DB hit).
   Authoritative `auth.api.getSession({ headers })` in the gated layout / server component.

4. **Don't fake Payload access control.** Better Auth's session is **NOT** auto-surfaced to
   Payload's `req.user`. Either build that bridge for real, **or** (simpler) lock the Payload
   API admin-only and fetch customer data in server components filtered by the BA user id
   (explicit `where` + `overrideAccess`). **Never ship access rules that read
   `req.user.<field>` when nothing populates it** — they look safe but enforce nothing.

5. **Gate sign-up to taste.** BA defaults to open `emailAndPassword`. If accounts should
   only come from another event (e.g. a purchase/webhook), **don't expose a client
   `signUp`** — create the user server-side via the adapter/Local API and use magic-link
   sign-in only.

## Adapter skeleton (the prize — full version in delieta)

```ts
// src/lib/better-auth-payload-adapter.ts — bridge BA → Payload Local API
import { createAdapterFactory } from "better-auth/adapters";

const MODEL_TO_SLUG: Record<string, string> = {
  user: "users", session: "sessions", account: "accounts", verification: "verifications",
};
const slugFor = (m: string) => MODEL_TO_SLUG[m] ?? `${m}s`;

export const payloadBetterAuthAdapter = createAdapterFactory({
  config: {
    adapterId: "payload-local-api",
    disableIdGeneration: true, // Postgres mints the (uuid) id; BA reads it back
    supportsDates: true, supportsBooleans: true, supportsJSON: true,
    transaction: false,        // Payload Local API exposes no nested-tx primitive
  },
  adapter: () => ({
    async create({ model, data, select }) {
      const p = await getPayloadClient();
      const doc = await p.create({ collection: slugFor(model), data, depth: 0 });
      return applySelect(doc, select);
    },
    // findOne / findMany / update / delete / count — all via p.* at depth:0,
    // translating BA's CleanedWhere → Payload where: { field: { equals|in|like ... } }
  }),
});
```
Then `betterAuth({ database: payloadBetterAuthAdapter, emailAndPassword: {...} })` in
`src/lib/auth.ts`, and pair the Postgres adapter with `idType: "uuid"`.

## Common Mistakes

| Mistake | Reality |
|---|---|
| Use the `payload-auth` plugin / `@payload-auth/better-auth-db-adapter` | Deprecated, pins old payload/BA, and its **sign-IN path silently fails** on Payload 3.85 / BA 1.6 (delieta's documented failure). Hand-roll via `createAdapterFactory`. |
| One role-gated `users` table for admins **and** customers | Fights both tools and conflates two cookie/session systems. Keep `auth:true` on `admins` only; customers are a separate BA-driven `users` collection. |
| Assume the bridge makes BA sessions resolve into Payload `req.user` | It does **not** by default. Build that bridge explicitly or filter by BA user id in server components. Dormant `req.user.<x>` rules enforce nothing. |
| Make the customer `users` collection `auth: true` | Adds Payload's own password/salt/login machinery that fights BA. BA owns customer creds on `accounts`. |
| Omit `disableIdGeneration: true` / `depth: 0` | BA must read DB-generated ids back, and expects relationship fields as plain string ids. |
| Run `npx @better-auth/cli migrate` | Payload owns the schema. Let Payload create the columns; don't dual-migrate. |

## Reference Implementation
**delieta** repo (verified Next 16.2.6 · Payload 3.85 · better-auth 1.6.11):
- `src/lib/better-auth-payload-adapter.ts` — the adapter (≈270 lines).
- `src/lib/auth.ts` / `src/lib/auth-client.ts` — BA server + client (client omits `baseURL`
  → uses current origin, avoids CORS).
- `src/collections/Admins.ts` (`auth:true`, `admin.user`) vs
  `src/collections/auth/{Users,Accounts,Sessions,Verifications}.ts` (plain, BA-driven).
- `src/proxy.ts` — optimistic gate; `src/app/(dashboard)/app/layout.tsx` — authoritative
  `getSession`; `src/lib/dashboard-data.ts` — explicit-`where` customer data access.
- `src/app/api/auth/[...all]/route.ts` — `toNextJsHandler(auth)`, outside `(payload)`.
