---
type: spec
summary: "Two related studio→customer video-delivery hardenings. (1) Large uploads: the studio browser→Vercel Blob upload gains multipart:true so 200–500 MB films upload reliably (chunked, parallel, per-part retry) instead of one fragile long PUT; the 2 GB token cap is unchanged. (2) External delivery link: orders gain https-validated proofUrl + finalVideoUrl fields with a studio editor; the proof_ready/delivered guardrail accepts an uploaded file OR a valid link, and the customer sees the in-app player and/or an 'open the link' affordance — so a parent always has a reliable way to get their film even when the file is too large to upload."
status: draft
created: 2026-06-17
related: ["[[studio]]", "[[auth-gating]]", "[[browser-to-blob-uploads-metadata-media]]", "[[local-disk-video-delivery]]"]
sources:
  - "components/studio/video-upload.tsx"
  - "app/(site)/studio/api/blob-upload/route.ts"
  - "lib/studio-order-mutations.ts"
  - "lib/studio-actions.ts"
  - "lib/studio-workflow.ts"
  - "collections/Orders.ts"
  - "components/app/video-player.tsx"
  - "components/app/proof-review.tsx"
  - "app/(site)/studio/(gated)/orders/[id]/page.tsx"
  - "app/(site)/(app)/app/orders/[id]/page.tsx"
---

# Studio video delivery — large uploads + external delivery link

**Goal:** The studio can reliably deliver the preview and the final film to a
parent even for big files, with a redundant external link so the parent always
has a way to receive it.

Two independent-but-related changes, shipped together:

1. **Large uploads** — 200–500 MB (up to 2 GB) films upload reliably.
2. **External delivery link** — a per-slot https link (Google Drive / Dropbox /
   WeTransfer / …) that can stand alone as the delivery OR back up an upload.

**Decisions (brand owner, 2026-06-17):**
- The external link can **stand alone OR back up** an upload: if a file is
  uploaded the link shows alongside it; if no file is uploaded a valid link alone
  lets the studio mark `proof_ready` / `delivered` (the link is the delivery).
- **Separate** links for the preview and the final film (mirroring the two
  upload slots), not one shared field.
- Accept **any well-formed `https://` URL** (no provider allowlist); reject
  non-https and unsafe schemes; render safely.

---

## 1. Large uploads (multipart)

**Problem:** `components/studio/video-upload.tsx` calls `@vercel/blob/client`
`upload()` WITHOUT `multipart`. The browser streams straight to Blob (good — the
server never sees the bytes, and the token route
`app/(site)/studio/api/blob-upload/route.ts` already allows up to
`MAX_VIDEO_BYTES = 2 GB`), but a single long PUT for a 200–500 MB file stalls or
fails on real networks. The size cap is NOT the blocker; the single-request
upload is.

**Change:** pass `multipart: true` to `upload()` (the installed `@vercel/blob`
`^2.4.0` supports it). Blob splits the file into parts uploaded in parallel with
per-part retry; `onUploadProgress` still drives the existing progress bar. No
server-side byte handling changes; `attachUploadedVideo` is unchanged.

- Keep the 2 GB cap and the `video/mp4|quicktime|webm|x-matroska` allowlist in
  the token route. Optionally make the over-cap / wrong-type rejection message a
  touch friendlier (it is already relayed to the client).
- No new dependency, no new route.

This is the whole of change (1): one option flag plus its test.

## 2. The delivery-link data + validator

Add to `collections/Orders.ts` (admin, after `finalVideo`):
- `proofUrl` — text. The external link for the **preview**.
- `finalVideoUrl` — text. The external link for the **final film**.

(Plain `text`; not Payload's `type: "upload"`. These are pasted URLs, not media.)

Migration `migrations/<date>_orders_delivery_urls.ts` — additive + idempotent,
mirroring `20260617_000000_orders_access_token`: `ADD COLUMN IF NOT EXISTS
"proof_url" text;` + `ADD COLUMN IF NOT EXISTS "final_video_url" text;`. No index
(these are never looked up by value).

Pure validator `lib/delivery-url.ts` (no DB, unit-tested):
- `normalizeDeliveryUrl(input: string): { ok: true; url: string; host: string } | { ok: false; error: string }`
  - trim; empty → `{ ok:false, error:"Paste a link first." }`.
  - parse with `new URL()`; on throw → `{ ok:false, error:"That does not look like a valid link." }`.
  - require `protocol === "https:"` — reject `http:`, `javascript:`, `data:`,
    `mailto:`, etc. → `{ ok:false, error:"Links must start with https://" }`.
  - on success return the canonical `url.href` and `url.host` (for display).
- `deliveryUrlHost(url: string): string | null` — safe host extraction for
  rendering (returns null if the stored value is somehow not a valid https URL,
  so the customer UI can refuse to render an unsafe link defensively).

## 3. Studio input + guardrail

**Editor — `components/studio/delivery-link-editor.tsx`** (`"use client"`,
mirrors `components/studio/promised-by-editor.tsx`): a labelled URL `<input>`
with a **description explaining its purpose**:

> *"Paste a Google Drive, Dropbox, or WeTransfer link. Use it as a backup so the
> parent always has a way to get the film — or as the delivery itself when the
> file is too large to upload here."*

Save / Clear buttons, in-flight (`aria-busy`) + inline error states, shows the
current link (as a safe `open ↗` to its host) when set. Keyed by the existing
`VideoKind` (`"proof" | "finalVideo"`) so it shares one vocabulary with the
upload slots: one instance under the preview slot (`kind="proof"`), one under the
final-film slot (`kind="finalVideo"`), rendered next to each `VideoUpload` in
`app/(site)/studio/(gated)/orders/[id]/page.tsx`.

**Action — `setDeliveryUrl` in `lib/studio-actions.ts`** (`"use server"`):
`setDeliveryUrl(orderId, kind: VideoKind, rawUrl: string | null)` — begins with
`requireStudioUserOrRedirect()`, delegates to the auth-skipping core, revalidates
studio + customer paths. (Same security split as the other studio actions; the
core is NOT exported from the `"use server"` module.)

**Core — `applyDeliveryUrlCore` in `lib/studio-order-mutations.ts`** (NOT
`"use server"`): when `rawUrl` is null/empty → clear the field; else
`normalizeDeliveryUrl(rawUrl)` → on `ok:false` return the `{ ok:false, error }`,
else write the canonical `url` to `proofUrl` (kind `"proof"`) or `finalVideoUrl`
(kind `"finalVideo"`) via the Payload Local API (`overrideAccess: true`). Returns
the shared `StudioActionResult`.

**Guardrail — `applyOrderStatusCore` in `lib/studio-order-mutations.ts`:** today
(lines ~55–62) it reads `requirementFor(nextStatus)` and rejects when the matching
media is missing:
```ts
if (requirement === "proof" && !order.proof) → reject
if (requirement === "finalVideo" && !order.finalVideo) → reject
```
Change to accept the link as an equal alternative:
```ts
if (requirement === "proof" && !order.proof && !order.proofUrl) →
  reject "Add a preview film or a delivery link before sharing the proof with the parent."
if (requirement === "finalVideo" && !order.finalVideo && !order.finalVideoUrl) →
  reject "Add the final film or a delivery link before marking this delivered."
```
`requirementFor` in `lib/studio-workflow.ts` is unchanged (it still names the
slot); only the satisfied-check widens. The studio workflow-card hint that
mirrors this requirement is reworded to "needs a film or a delivery link."

## 4. Customer display

Pass the two new fields from the order detail page
(`app/(site)/(app)/app/orders/[id]/page.tsx`) into the action components.

**Final — `components/app/video-player.tsx`:** today it shows the gated `<video>`
+ Download when `hasVideo`, else a "being finalized" fallback. New `finalVideoUrl`
prop:
- uploaded film present → player + Download as today, **plus** (when
  `finalVideoUrl`) a calm secondary line: *"Prefer to download it from {host}?
  Open the link ↗"*.
- no upload but `finalVideoUrl` present → the link becomes the PRIMARY affordance:
  *"{Child}'s fairy tale is ready — open it here ↗"*, replacing the "being
  finalized" fallback.
- neither → the existing "being finalized" fallback (unchanged).

**Preview — `components/app/proof-review.tsx`:** add a `proofUrl?: string | null`
prop. When the in-app `proof` media is present, render it as today and add the
same secondary "open from {host} ↗" line when `proofUrl` is set. When there is no
`proof` media but `proofUrl` is set, show the link as the way to view the preview
(the approve / request-change actions stay available — they act on the order, not
the media). `readOnly` (revisions) behaves the same, minus the actions.

**Link rendering (both):** `target="_blank" rel="noopener noreferrer"`, label
shows the destination host via `deliveryUrlHost()`, and the value is re-validated
as `https` before render — a stored value that somehow isn't a safe https URL is
not rendered as a link (defense in depth; should never happen given the action
validates on write).

## 5. Error handling

- Upload: multipart per-part retry is automatic in the SDK; a genuine failure
  keeps the existing `"The upload did not finish. Please try again."`.
- URL: invalid input → inline editor error from `normalizeDeliveryUrl`; never
  stored. Clearing stores null.
- Guardrail: marking `proof_ready` / `delivered` with neither an upload nor a
  link → the reworded rejection messages above (server-enforced, not just a
  disabled button).

## 6. Testing

- `tests/lib/delivery-url.test.ts` (pure, TDD): https accepted (canonical href +
  host); `http://`, `javascript:`, `data:`, `mailto:`, empty, and malformed
  rejected with messages; `deliveryUrlHost` returns the host for valid, null for
  invalid.
- `tests/studio/actions.test.ts` (extend, DB-backed): `setDeliveryUrl` stores a
  valid link, rejects an invalid one (order unchanged), and clears on null; the
  guardrail now ACCEPTS `proof_ready` with only `proofUrl` (no `proof`) and
  `delivered` with only `finalVideoUrl` (no `finalVideo`), and still REJECTS when
  neither is present.
- Customer components (node-env assertions): `video-player` renders the link
  affordance when `finalVideoUrl` is set (both alongside an upload and link-only);
  `proof-review` renders `proofUrl` similarly. (Follow the existing component-test
  style in the repo; assert on returned element structure, no jsdom.)
- Large-upload: assert `upload()` is invoked with `multipart: true` (mock
  `@vercel/blob/client` in a `video-upload` test, or assert at the call site) —
  small guard so the flag can't silently regress.

## 7. Mind maintenance

- Update the `[[studio]]` zone guardrail invariant: "proof_ready requires a proof
  attached; delivered requires the final film" → "…requires a proof **or a
  delivery link**; delivered requires the final film **or a delivery link**" —
  still server-enforced; `enforcedBy` stays `tests/studio/actions.test.ts`.
- Add the new files to the `[[studio]]` globs (`lib/delivery-url.ts`,
  `components/studio/delivery-link-editor.tsx`, `tests/lib/delivery-url.test.ts`);
  add the migration to `[[payload-backend]]`. Re-stamp `studio`, `payload-backend`
  (and `auth-gating` if the customer components it owns change) to HEAD.
- A decision record is optional (the guardrail-widening + link trust model is the
  only non-obvious "why"); a short one is worth adding.

## 8. Out of scope

- No managed video host (Mux / Cloudflare Stream) — still tracked in
  `[[local-disk-video-delivery]]`.
- No resumable-upload library (tus/uppy) — multipart is enough for two operators.
- No provider allowlist (any https accepted, by decision).
- No email re-send when a link is added/edited — the link surfaces on the order
  page and via the existing status email's destination; a status change still
  emails as today.
- No "delivery confirmation / read receipt" — the redundant link IS the
  reliability mechanism.
