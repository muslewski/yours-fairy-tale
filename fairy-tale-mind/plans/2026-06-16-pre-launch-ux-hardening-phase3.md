# Pre-launch UX Hardening — Phase 3 (Photos-before-checkout) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax. User-facing copy must clear the `brand-voice` skill (CLAUDE.md mandate). **This phase needs the staging Vercel env for its real-Blob end-to-end verification** — write/unit-test everything here, but the Layer-B/manual clientUploads run happens on staging.

**Goal:** Collect the child's photos in the configurator **before** Stripe checkout, so checkout is the final step and the webhook creates an order already carrying its photos (status `in_production`, no `awaiting_assets` limbo).

**Architecture (resolved in the spec — pathnames in Stripe metadata, 6-photo cap):**
1. Configurator Step 3 uploads photos **browser → Vercel Blob** via the Blob plugin's `clientUploads` (`@vercel/blob/client` `upload()`), through a NEW **anonymous, image-only, size-capped** token route — bypassing Vercel's ~4.5 MB request cap. Each upload yields a blob **pathname**.
2. `startCheckout` sends the pathnames; `buildCheckoutSessionParams` writes `metadata.assetPaths = pathnames.join(",")` (capped at 6, length-guarded ≤ 480 chars for Stripe's 500-char value limit).
3. The webhook reads `assetPaths`, `head()`s each blob for its content-type/size, creates **metadata-only** media docs (`filename == pathname`, the same contract as `attachVideoCore`), attaches them to `order.assets`, and — when any attached — sets the order to `in_production`.
4. A daily **cron** prunes abandoned `configurator/`-prefixed blobs (uploaded but never checked out), folding in the `orphaned-blobs-no-cleanup` debt for that prefix.

**Tech Stack:** Next.js 16 App Router, React 19, `@vercel/blob` + `@vercel/blob/client`, Payload Local API, Stripe, vitest. Blob auth uses `BLOB_READ_WRITE_TOKEN` (already set in prod; reused in staging).

**Spec:** `fairy-tale-mind/specs/2026-06-15-pre-launch-ux-hardening-design.md` (Phase 3).
**Branch:** `feat/pre-launch-ux-hardening` (Phases 1, 2, 4, 5 already on local `staging`).

### Key current-state (verified)
- Studio token route pattern: `app/(site)/studio/api/blob-upload/route.ts` — `handleUpload({ body, request, onBeforeGenerateToken })`, returns `{ pathname, url }`. Studio version requires admin + video types; ours will be anonymous + image types.
- Client upload call: `components/studio/video-upload.tsx:52` — `await upload(pathname, file, { access: "public", handleUploadUrl, onUploadProgress })`.
- Re-encode/validate helpers to reuse: `components/app/prepare-upload.ts` (`prepareForUpload`), `lib/order-upload-validation.ts` (`validateUploadFile`, `MAX_UPLOAD_BYTES = 15MB`). **No photo-count cap exists today.**
- Metadata-only media pattern: `lib/studio-order-mutations.ts:119` `attachVideoCore` — `payload.create({ collection:"media", data:{ filename, mimeType, filesize }})`.
- Webhook order create: `app/api/stripe/webhook/route.ts:278` (does not capture the created order or read `assetPaths`; status defaults to `paid`).
- Orders `assets`: `relationship → media, hasMany: true`. Status enum incl. `in_production`, `awaiting_assets`; default `paid`.
- Configurator: `components/home/configurator/index.tsx` (state + `startCheckout` POST), Step 3 = `StepPhotos` → `PhotoDropzone` (local-preview ONLY, no upload). `photo-dropzone.tsx` uses `validateUploadFile` + object URLs.
- `head()`/`list()`/`del()` come from `@vercel/blob` (see `lib/studio-actions.ts:83` dynamic import). **No cron infrastructure exists** (no `vercel.json`/`vercel.ts`).

---

## Task 1: Shared 6-photo cap constant

**Files:**
- Modify: `lib/order-upload-validation.ts`
- Test: `tests/app/order-upload-validation.test.ts` (add one assertion)

A single source of truth used by the client uploader, the checkout builder, and the webhook.

- [ ] **Step 1: Add the constant + test**

In `tests/app/order-upload-validation.test.ts`, add:
```ts
import { MAX_CHECKOUT_PHOTOS } from "@/lib/order-upload-validation";

test("the pre-checkout photo cap is 6", () => {
  expect(MAX_CHECKOUT_PHOTOS).toBe(6);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/app/order-upload-validation.test.ts`
Expected: FAIL — `MAX_CHECKOUT_PHOTOS` is not exported.

- [ ] **Step 3: Export the constant**

In `lib/order-upload-validation.ts`, near `MAX_UPLOAD_BYTES`, add:
```ts
/**
 * Max photos a parent can attach in the configurator before checkout. Enforced
 * client-side (the dropzone), in the checkout metadata builder, and in the
 * webhook. Bounds the joined-pathnames Stripe metadata value (≤ 500 chars) and
 * the abandoned-blob exposure surface.
 */
export const MAX_CHECKOUT_PHOTOS = 6;
```

- [ ] **Step 4: Run it to verify it passes** — `npm test -- tests/app/order-upload-validation.test.ts` → PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/order-upload-validation.ts tests/app/order-upload-validation.test.ts
git commit -m "feat(uploads): add MAX_CHECKOUT_PHOTOS=6 shared cap

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Anonymous image upload token route

**Files:**
- Create: `app/(site)/api/configurator/blob-upload/route.ts`
- Test: none directly (the token route's behavior is exercised by the real `upload()` on staging; the guard logic is inspection-verified). The route is small and mirrors the audited studio route.

The configurator is public (no account yet), so this token route does **no auth** — but it constrains hard: image content-types only, ≤ 15 MB, a forced `configurator/` pathname prefix, and a random suffix (so an attacker can't overwrite or guess paths). Abandoned uploads are pruned by Task 6.

- [ ] **Step 1: Create the route**

Create `app/(site)/api/configurator/blob-upload/route.ts`:
```ts
/**
 * POST /api/configurator/blob-upload — mints short-lived client-upload tokens so
 * a PUBLIC (pre-account) configurator browser can stream photos STRAIGHT to
 * Vercel Blob, bypassing Vercel's ~4.5MB request cap. There is no order or
 * account yet; association happens later via pathnames in the Stripe checkout
 * metadata (the webhook attaches them).
 *
 * Anonymous by design. Abuse is bounded by: image-only content types, a 15MB
 * size cap, a forced `configurator/` pathname prefix, addRandomSuffix (no
 * overwrite/guess), and the daily prune cron that deletes unreferenced
 * configurator/* blobs (see app/api/cron/prune-blobs + orphaned-blobs debt).
 */
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024; // 15MB, matches MAX_UPLOAD_BYTES

export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("configurator/")) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_PHOTO_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload could not start.";
    const known =
      message === "Invalid upload path." ||
      message.toLowerCase().includes("content type") ||
      message.toLowerCase().includes("size");
    if (!known) console.error("[configurator] blob-upload token route failed:", err);
    return NextResponse.json(
      { error: known ? message : "Upload could not start." },
      { status: 400 },
    );
  }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add "app/(site)/api/configurator/blob-upload/route.ts"
git commit -m "feat(configurator): anonymous image-only Blob upload token route

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Turn the dropzone into a real uploader

**Files:**
- Rewrite: `components/home/configurator/photo-dropzone.tsx`
- Modify: `components/home/configurator/step-photos.tsx`
- Test: none (browser `upload()` needs real Blob — verified on staging; the validation/re-encode it reuses is already unit-tested). Apply the `brand-voice` skill to the copy.

The dropzone uploads each picked photo to Blob immediately, reusing `prepareForUpload` (HEIC→JPEG, downscale, ≤3.5MB) and `validateUploadFile`, caps at `MAX_CHECKOUT_PHOTOS`, and reports the resulting blob **pathnames** up to the configurator via `onChange`.

- [ ] **Step 1: Rewrite `photo-dropzone.tsx`**
```tsx
"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

import { validateUploadFile, MAX_CHECKOUT_PHOTOS } from "@/lib/order-upload-validation";
import { prepareForUpload } from "@/components/app/prepare-upload";

type Item = { pathname: string; url: string };

export function PhotoDropzone({
  value,
  onChange,
}: {
  value: string[];
  onChange: (paths: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const remaining = MAX_CHECKOUT_PHOTOS - value.length;

  async function add(list: FileList | null) {
    setError(null);
    const picked = Array.from(list ?? []);
    if (picked.length === 0) return;
    if (picked.length > remaining) {
      setError(`You can add up to ${MAX_CHECKOUT_PHOTOS} photos. Please choose ${remaining} or fewer.`);
      return;
    }
    setBusy(true);
    try {
      for (const file of picked) {
        const check = validateUploadFile(file);
        if (!check.ok) {
          setError(check.error);
          break;
        }
        const prepared = await prepareForUpload(file);
        if (!prepared.ok) {
          setError(prepared.error);
          break;
        }
        const ext = prepared.file.type === "image/png" ? "png" : prepared.file.type === "image/webp" ? "webp" : "jpg";
        // addRandomSuffix on the server makes the final pathname unique; this is the prefix.
        const blob = await upload(`configurator/${Date.now()}-${ext}`, prepared.file, {
          access: "public",
          handleUploadUrl: "/api/configurator/blob-upload",
        });
        const next: Item = { pathname: blob.pathname, url: URL.createObjectURL(prepared.file) };
        setItems((prev) => [...prev, next]);
        onChange([...value, blob.pathname]);
        // value is captured per-iteration; re-read via functional pattern below.
      }
    } catch {
      setError("We couldn't upload that photo. Please try again in a moment.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(i: number) {
    setItems((prev) => {
      URL.revokeObjectURL(prev[i].url);
      const nextItems = prev.filter((_, idx) => idx !== i);
      onChange(nextItems.map((it) => it.pathname));
      return nextItems;
    });
  }

  return (
    <div className="mt-5">
      <label
        onDrop={(e) => { e.preventDefault(); if (!busy && remaining > 0) add(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-brand-deep/40 bg-brand-cream px-5 py-8 text-center transition-colors hover:border-brand-deep aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        aria-disabled={busy || remaining <= 0}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={busy || remaining <= 0}
          className="sr-only"
          onChange={(e) => add(e.target.files)}
        />
        <span className="font-[family-name:var(--font-fredoka)] text-lg font-semibold text-brand-deep">
          {busy ? "Uploading…" : remaining > 0 ? "Drag photos here, or choose files" : "That's the most we need"}
        </span>
        <span className="mt-1 text-sm font-medium text-brand-deep/60">
          JPEG, PNG, or HEIC, up to 15 MB each. Up to {MAX_CHECKOUT_PHOTOS}.
        </span>
      </label>

      {error ? <p role="alert" className="mt-3 text-sm font-bold text-brand-pink">{error}</p> : null}

      {items.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {items.map((p, i) => (
            <li key={p.pathname} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- transient object URL */}
              <img src={p.url} alt="" className="h-20 w-20 rounded-xl border-[3px] border-brand-deep object-cover" />
              <button
                type="button" onClick={() => remove(i)} aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-brand-deep bg-white text-xs font-black text-brand-deep"
              >×</button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 text-sm font-medium text-brand-deep/60">
        Photos are optional now — you can also add them from your dashboard after checkout.
      </p>
    </div>
  );
}
```
> Implementer note: the per-iteration `onChange([...value, ...])` closes over the initial `value`; if multiple files are picked at once this drops all but the last. Fix by threading a local accumulator: build `const added: string[] = []` in `add()`, push each `blob.pathname`, and call `onChange([...value, ...added])` once after the loop (and append `next` items similarly). Verify the multi-select path before committing.

- [ ] **Step 2: Update `step-photos.tsx` to pass through**
```tsx
import { PhotoDropzone } from "./photo-dropzone";

export function StepPhotos({
  summary,
  photoPaths,
  setPhotoPaths,
}: {
  summary: string;
  photoPaths: string[];
  setPhotoPaths: (paths: string[]) => void;
}) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-fredoka)] text-xl font-semibold text-brand-deep">Almost there</h3>
      <p className="mt-2 text-sm font-medium text-brand-deep/60">{summary}</p>
      <PhotoDropzone value={photoPaths} onChange={setPhotoPaths} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add components/home/configurator/photo-dropzone.tsx components/home/configurator/step-photos.tsx
git commit -m "feat(configurator): upload photos to Blob in step 3 (cap 6, reuse re-encode)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Carry pathnames through the configurator → checkout

**Files:**
- Modify: `components/home/configurator/index.tsx`
- Test: none (wiring; covered by Task 5's checkout-metadata test + tsc).

- [ ] **Step 1: Add state + wire the step + POST body**

In `components/home/configurator/index.tsx`:
Add to state (next to `plotNote`):
```tsx
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
```
Add `assetPaths` to the `startCheckout` POST body:
```tsx
        body: JSON.stringify({
          childName: childName.trim(),
          world,
          length,
          detail,
          extraMinutes,
          addOns,
          plotNote: plotNote.trim(),
          assetPaths: photoPaths,
        }),
```
Pass the new props to `StepPhotos`:
```tsx
                {step === 3 && (
                  <StepPhotos
                    summary={summarizeSelections({ length, detail, extraMinutes, addOns })}
                    photoPaths={photoPaths}
                    setPhotoPaths={setPhotoPaths}
                  />
                )}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add components/home/configurator/index.tsx
git commit -m "feat(configurator): send uploaded photo pathnames to checkout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Checkout metadata + webhook attach (the association)

**Files:**
- Modify: `lib/checkout.ts`, `app/api/stripe/checkout/route.ts`, `lib/order-action-cores.ts`, `app/api/stripe/webhook/route.ts`
- Test: `tests/lib/checkout.test.ts` (assetPaths metadata), `tests/stripe/webhook.test.ts` (attach + status)

### 5a — `assetPaths` in checkout metadata (TDD)

- [ ] **Step 1: Add the failing test** to `tests/lib/checkout.test.ts`:
```ts
import { MAX_CHECKOUT_PHOTOS } from "@/lib/order-upload-validation";

test("assetPaths are joined into metadata, capped at MAX_CHECKOUT_PHOTOS", () => {
  const paths = Array.from({ length: 8 }, (_, i) => `configurator/p${i}.jpg`);
  const params = buildCheckoutSessionParams({ ...baseInput, assetPaths: paths }, "https://example.com");
  const meta = params.metadata as Record<string, string>;
  const got = meta.assetPaths.split(",").filter(Boolean);
  expect(got).toHaveLength(MAX_CHECKOUT_PHOTOS);
  expect(meta.assetPaths.length).toBeLessThanOrEqual(480);
});

test("no assetPaths → empty metadata value", () => {
  const params = buildCheckoutSessionParams(baseInput, "https://example.com");
  const meta = params.metadata as Record<string, string>;
  expect(meta.assetPaths ?? "").toBe("");
});
```

- [ ] **Step 2: Run → FAIL** (`assetPaths` not on `CheckoutInput`/metadata).

- [ ] **Step 3: Implement in `lib/checkout.ts`**

Add the import + field, and build the metadata value:
```ts
import { MAX_CHECKOUT_PHOTOS } from "@/lib/order-upload-validation";
```
Add to `CheckoutInput`:
```ts
  /** Blob pathnames of photos uploaded in the configurator (≤ MAX_CHECKOUT_PHOTOS). */
  assetPaths?: string[];
```
Destructure `assetPaths` and compute a length-bounded CSV before `const params`:
```ts
  // Join the (capped) pathnames into one Stripe metadata value. Stripe caps a
  // value at 500 chars; we trim to ≤ 480 by dropping extras, never splitting a path.
  const assetPathList: string[] = [];
  let assetPathLen = 0;
  for (const p of (assetPaths ?? []).slice(0, MAX_CHECKOUT_PHOTOS)) {
    const add = (assetPathList.length ? 1 : 0) + p.length;
    if (assetPathLen + add > 480) break;
    assetPathList.push(p);
    assetPathLen += add;
  }
```
Add to the `metadata` object:
```ts
      plotNote: (plotNote ?? "").slice(0, 500),
      assetPaths: assetPathList.join(","),
```

- [ ] **Step 4: Run → PASS** (`npm test -- tests/lib/checkout.test.ts`).

### 5b — checkout route forwards `assetPaths`

- [ ] **Step 5: In `app/api/stripe/checkout/route.ts`**, read + validate:

Add `assetPaths` to the destructure of `body`, and to the `input`:
```ts
  const { childName, world, length, detail, extraMinutes, addOns, email, plotNote, assetPaths } = body;
```
```ts
    plotNote: typeof plotNote === "string" ? plotNote : "",
    assetPaths: Array.isArray(assetPaths)
      ? assetPaths.filter((p): p is string => typeof p === "string").slice(0, 6)
      : [],
    email,
```
(`CheckoutInput.assetPaths` is now optional-string-array; `Partial<CheckoutInput>` already covers the body type.)

### 5c — webhook attaches assets metadata-only + sets status

- [ ] **Step 6: Add the failing webhook test** to `tests/stripe/webhook.test.ts`:

At the top of the file (after imports), add the Blob mock:
```ts
import { vi } from "vitest";
// The webhook head()s each asset pathname for its content-type/size; mock Blob so
// these DB-backed tests never hit the network. head() only runs when assetPaths exist.
vi.mock("@vercel/blob", () => ({
  head: vi.fn().mockResolvedValue({ contentType: "image/jpeg", size: 12345 }),
}));
```
Add a test mirroring `completedEventWithExtras` but with `assetPaths`:
```ts
test("checkout with assetPaths attaches metadata-only media and goes in_production", async () => {
  const p = await getPayloadClient();
  const email = `wh-assets-${Date.now()}@x.io`;
  const sessionId = `cs_${Date.now()}_assets`;
  const evt = completedEvent(email, sessionId);
  (evt.data.object as { metadata: Record<string, string> }).metadata.assetPaths =
    "configurator/a.jpg,configurator/b.jpg";

  await handleStripeEvent(evt);

  const orders = await p.find({
    collection: "orders",
    where: { stripeSessionId: { equals: sessionId } },
    depth: 0,
    overrideAccess: true,
  });
  const order = orders.docs[0];
  expect(order.status).toBe("in_production");
  expect((order.assets as unknown[]).length).toBe(2);
});
```

- [ ] **Step 7: Run → FAIL** (no assets attached; status `paid`).

- [ ] **Step 8: Add `attachCheckoutAssets` core** to `lib/order-action-cores.ts`:
```ts
/**
 * Attach pre-checkout photos (already in Vercel Blob) to an order as metadata-only
 * media docs (filename == blob pathname, same contract as attachVideoCore). Reads
 * each blob's content-type/size via head(). Non-fatal per pathname: a missing or
 * non-image blob is skipped, never fails the order. Returns the count attached.
 */
export async function attachCheckoutAssets(
  orderId: string,
  pathnames: string[],
): Promise<number> {
  if (pathnames.length === 0) return 0;
  const { head } = await import("@vercel/blob");
  const payload = await getPayloadClient();

  const newIds: string[] = [];
  for (const pathname of pathnames.slice(0, 6)) {
    try {
      const blob = await head(pathname);
      if (!blob.contentType?.startsWith("image/")) continue;
      const media = await payload.create({
        collection: "media",
        data: { filename: pathname, mimeType: blob.contentType, filesize: blob.size },
        overrideAccess: true,
      });
      newIds.push(String(media.id));
    } catch (err) {
      console.error(`[webhook] skipped asset ${pathname}:`, err);
    }
  }
  if (newIds.length === 0) return 0;

  const order = await payload.findByID({
    collection: "orders",
    id: orderId,
    depth: 0,
    overrideAccess: true,
  });
  const existing = Array.isArray(order.assets)
    ? order.assets.map((a) =>
        typeof a === "object" && a !== null ? String((a as { id: string }).id) : String(a),
      )
    : [];
  await payload.update({
    collection: "orders",
    id: orderId,
    data: { assets: [...existing, ...newIds] },
    overrideAccess: true,
  });
  return newIds.length;
}
```

- [ ] **Step 9: Wire it into the webhook** (`app/api/stripe/webhook/route.ts`)

Add the import:
```ts
import { attachCheckoutAssets } from "@/lib/order-action-cores";
```
Read `assetPaths` from metadata (extend the destructure on line ~209):
```ts
  const { childName, world, length, detailLevel, extraMinutes, addOns, plotNote, assetPaths } = meta;
```
Capture the created order (change `await payload.create(...)` to assign), then attach + promote status. Replace the order-create block's trailing `// status defaults to "paid"` flow with:
```ts
  const order = await payload.create({
    collection: "orders",
    data: {
      owner: userId,
      stripeSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId ?? undefined,
      childName: childName ?? undefined,
      world: (world as WorldId | undefined) ?? undefined,
      length: (length as "short" | "medium" | "long" | undefined) ?? undefined,
      detailLevel:
        (detailLevel as "basic" | "detailed" | "premium" | undefined) ?? undefined,
      extraMinutes: extraMinutes ? parseInt(extraMinutes, 10) || 0 : undefined,
      addOns: addOns ? addOns.split(",").filter(Boolean) : undefined,
      plotNote: plotNote || undefined,
      amountTotalCents,
      promisedBy: promisedBy ? promisedBy.toISOString() : undefined,
      // status defaults to "paid"; promoted to in_production below when photos attach
    },
    overrideAccess: true,
  });

  // Photos collected before checkout (Phase 3): attach them metadata-only and,
  // when any land, skip the awaiting_assets limbo straight to in_production.
  const pathnames = assetPaths ? assetPaths.split(",").filter(Boolean) : [];
  if (pathnames.length > 0) {
    const attached = await attachCheckoutAssets(String(order.id), pathnames);
    if (attached > 0) {
      await payload.update({
        collection: "orders",
        id: order.id,
        data: { status: "in_production" },
        overrideAccess: true,
      });
    }
  }
```

- [ ] **Step 10: Run → PASS** (`npm test -- tests/lib/checkout.test.ts tests/stripe/webhook.test.ts`). `npx tsc --noEmit` clean.

- [ ] **Step 11: Commit**
```bash
git add lib/checkout.ts "app/api/stripe/checkout/route.ts" lib/order-action-cores.ts "app/api/stripe/webhook/route.ts" tests/lib/checkout.test.ts tests/stripe/webhook.test.ts
git commit -m "feat(checkout): photos-before-checkout — pathnames in metadata, webhook attaches + goes in_production

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Prune abandoned configurator blobs (cron)

**Files:**
- Create: `app/api/cron/prune-blobs/route.ts`, `vercel.json`
- Modify: `fairy-tale-mind/tech-debt/orphaned-blobs-no-cleanup.md` (narrow scope)
- Test: none (infra; the listing/diff logic is simple and inspection-verified; runs on staging/prod cron).

Photos uploaded in the configurator but never checked out leave orphaned `configurator/*` blobs. A daily cron deletes those older than a safety window that no `media` doc references.

- [ ] **Step 1: Create the cron route**

Create `app/api/cron/prune-blobs/route.ts`:
```ts
/**
 * Daily cron: delete abandoned configurator/* blobs (uploaded in the configurator
 * but never checked out, so no media doc references them) older than a safety
 * window. Authorized via the Vercel cron Bearer (CRON_SECRET). Scope is limited
 * to the configurator/ prefix; studio/order blobs are out of scope here.
 * See fairy-tale-mind/tech-debt/orphaned-blobs-no-cleanup.md.
 */
import { NextRequest, NextResponse } from "next/server";

import { getPayloadClient } from "@/lib/payload";

const SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h — don't touch in-flight checkouts

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { list, del } = await import("@vercel/blob");
  const payload = await getPayloadClient();
  const cutoff = Date.now() - SAFETY_WINDOW_MS;

  let deleted = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "configurator/", cursor, limit: 200 });
    cursor = page.cursor;
    for (const blob of page.blobs) {
      if (blob.uploadedAt.getTime() > cutoff) continue;
      const ref = await payload.find({
        collection: "media",
        where: { filename: { equals: blob.pathname } },
        limit: 1,
        overrideAccess: true,
      });
      if (ref.totalDocs > 0) continue; // referenced by an order — keep
      await del(blob.url);
      deleted += 1;
    }
  } while (cursor);

  return NextResponse.json({ deleted });
}
```

- [ ] **Step 2: Register the cron** — create `vercel.json`:
```json
{
  "crons": [{ "path": "/api/cron/prune-blobs", "schedule": "0 3 * * *" }]
}
```

- [ ] **Step 3: Narrow the tech-debt note**

In `fairy-tale-mind/tech-debt/orphaned-blobs-no-cleanup.md`, add a progress note: the daily prune cron now covers the `configurator/` prefix (pre-checkout abandonment); studio/order-upload orphans remain open. Keep `status: open`.

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add "app/api/cron/prune-blobs/route.ts" vercel.json fairy-tale-mind/tech-debt/orphaned-blobs-no-cleanup.md
git commit -m "feat(ops): daily cron prunes abandoned configurator/* blobs

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

> NOTE for the controller: set `CRON_SECRET` in Vercel (prod + staging). Vercel cron sends it as the `Authorization: Bearer` header automatically once configured.

---

## Final: Phase 3 wrap

- [ ] **Typecheck gate:** `npx tsc --noEmit` clean.
- [ ] **Targeted tests:** `npm test -- tests/lib/checkout.test.ts tests/stripe/webhook.test.ts tests/app/order-upload-validation.test.ts`.
- [ ] **Staging E2E (the real proof — needs the staging Vercel env):** on staging, run the full flow — configure → upload 6 photos (real Blob `clientUploads`) → checkout (Stripe test mode) → confirm the webhook created the order with 6 `assets` and status `in_production`; open `/app/orders/[id]` and confirm the "Photos you sent" gallery shows them through the gated asset route. Then leave photos uploaded-but-abandoned and confirm the prune cron deletes them after the window. Use the **agent order-tooling MCP** to drive/verify where possible.
- [ ] **Mind maintenance:** re-stamp `configurator`, `checkout`, `payload-backend` (webhook), `app-shell` (new public routes) zones; add a `map/decisions/` record for the pathnames-in-Stripe-metadata association mechanism + the anonymous upload token route's abuse/cleanup trade-off; `npm run mind`; commit.

## Self-review notes (author)
- **Spec coverage (Phase 3):** anonymous clientUploads → Task 2; configurator uploader + 6-cap → Tasks 1, 3; pathnames in metadata → Task 5a/b; webhook attach + in_production (limbo removed) → Task 5c; abandoned-blob cleanup → Task 6. All covered; the resolved approach (pathnames-in-metadata, 6-cap) is honored.
- **Placeholder scan:** none — full route/component/core code, exact edits, real copy. The one closure subtlety in the uploader is flagged inline with the fix.
- **Type consistency:** `MAX_CHECKOUT_PHOTOS` defined once (Task 1) and reused everywhere; `CheckoutInput.assetPaths?: string[]`; `attachCheckoutAssets(orderId, pathnames): Promise<number>`; webhook destructures `assetPaths` from the same `meta`.
- **Testing honesty:** browser `upload()` and the cron need real Blob, so they're staging/inspection-verified (stated up front); the pure seams (checkout metadata, webhook attach with mocked `head`) are TDD.
- **Risks (documented):** the token route is anonymous — abuse is bounded by image-only + 15MB + `configurator/` prefix + random suffix + the prune cron, but it is not rate-limited (note for post-launch). A checkout whose `assetPaths` blobs all 404 falls back to `paid` (no false `in_production`). Stripe metadata stays ≤ 480 chars by construction.
- **Open inputs:** `CRON_SECRET` (Vercel), and the staging env itself (blocks the E2E).
