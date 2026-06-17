# Studio Video Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The studio can deliver the preview and final film reliably even for big files (200–500 MB via multipart Blob uploads), and can attach an external `https` delivery link (Google Drive / Dropbox / …) that either backs up an upload or stands alone as the delivery — so a parent always has a way to receive their film.

**Architecture:** Two independent changes. (1) Add `multipart: true` to the existing browser→Vercel Blob client upload (server never sees the bytes; the 2 GB token cap is unchanged). (2) Add `proofUrl` + `finalVideoUrl` text fields to `orders`, a pure `https` validator, a studio link editor, a status guardrail that accepts an upload OR a link, and customer-facing display that shows the in-app player and/or an "open the link" affordance.

**Tech Stack:** Next.js 16 (App Router, server components + `"use client"` islands), Payload v3 on Postgres/Neon (additive migrations), `@vercel/blob@^2.4.0` client uploads, Vitest (node env, no jsdom).

**Source spec:** `fairy-tale-mind/specs/2026-06-17-studio-video-delivery-design.md`

---

## File Structure

**Create:**
- `lib/blob-upload-options.ts` — pure builder for the Blob client-upload options (so the `multipart` flag lives in one tested place).
- `lib/delivery-url.ts` — pure: `normalizeDeliveryUrl`, `deliveryUrlHost`, `deliveryView`. No DB.
- `components/studio/delivery-link-editor.tsx` — the studio URL editor (`"use client"`).
- `migrations/20260617_000001_orders_delivery_urls.ts` — additive columns.
- Tests: `tests/lib/blob-upload-options.test.ts`, `tests/lib/delivery-url.test.ts`.

**Modify:**
- `components/studio/video-upload.tsx` — use `videoUploadOptions` (multipart).
- `collections/Orders.ts` — `proofUrl` + `finalVideoUrl` fields.
- `migrations/index.ts` — register the migration.
- `lib/studio-order-mutations.ts` — `applyDeliveryUrlCore` + widen the `applyOrderStatusCore` guardrail.
- `lib/studio-actions.ts` — `setDeliveryUrl` action.
- `app/(site)/studio/(gated)/orders/[id]/page.tsx` — mount two `DeliveryLinkEditor`s.
- `components/app/video-player.tsx` — `finalVideoUrl` prop + link affordance.
- `components/app/proof-review.tsx` — `proofUrl` prop + link affordance.
- `app/(site)/(app)/app/orders/[id]/page.tsx` — pass the url fields through `ActionSlot`.
- `tests/studio/actions.test.ts` — `setDeliveryUrl` + widened-guardrail cases.

**Test command:** `npm test` (= `vitest run`). Single file: `npx vitest run <path>`. Types: `npx tsc --noEmit`.

---

## Task 1: Multipart large uploads

**Files:** Create `lib/blob-upload-options.ts`, `tests/lib/blob-upload-options.test.ts`; Modify `components/studio/video-upload.tsx`.

- [ ] **Step 1: Write the failing test** — `tests/lib/blob-upload-options.test.ts`:

```ts
/**
 * blob-upload-options — the studio video upload's Blob client options, with the
 * multipart flag pinned by a test so a 200 MB–2 GB film can't silently regress
 * to a single fragile PUT.
 */
import { describe, expect, test, vi } from "vitest";

import { videoUploadOptions } from "@/lib/blob-upload-options";

describe("videoUploadOptions", () => {
  test("enables multipart so large films upload as resilient chunks", () => {
    expect(videoUploadOptions("/studio/api/blob-upload", () => {}).multipart).toBe(true);
  });

  test("uploads with public access via the given handle url and wires progress", () => {
    const onProgress = vi.fn();
    const opts = videoUploadOptions("/studio/api/blob-upload", onProgress);
    expect(opts.access).toBe("public");
    expect(opts.handleUploadUrl).toBe("/studio/api/blob-upload");
    opts.onUploadProgress({ percentage: 42 });
    expect(onProgress).toHaveBeenCalledWith({ percentage: 42 });
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `npx vitest run tests/lib/blob-upload-options.test.ts` → FAIL (cannot resolve module).

- [ ] **Step 3: Implement** — `lib/blob-upload-options.ts`:

```ts
/**
 * blob-upload-options — options for the studio's browser→Vercel Blob client
 * upload (components/studio/video-upload.tsx). Extracted as pure data so the
 * `multipart: true` flag — which makes 200 MB–2 GB films upload as parallel,
 * individually-retried chunks instead of one long PUT that stalls on real
 * networks — is set in ONE tested place. No React, no SDK import.
 */
export interface BlobUploadProgress {
  percentage: number;
}

export interface VideoUploadOptions {
  access: "public";
  handleUploadUrl: string;
  multipart: true;
  onUploadProgress: (event: BlobUploadProgress) => void;
}

export function videoUploadOptions(
  handleUploadUrl: string,
  onUploadProgress: (event: BlobUploadProgress) => void,
): VideoUploadOptions {
  return { access: "public", handleUploadUrl, multipart: true, onUploadProgress };
}
```

- [ ] **Step 4: Run it, confirm PASS** — `npx vitest run tests/lib/blob-upload-options.test.ts`.

- [ ] **Step 5: Wire it into the upload component** — in `components/studio/video-upload.tsx`, add the import after the existing `upload` import (line 16):

```ts
import { videoUploadOptions } from "@/lib/blob-upload-options";
```

and replace the existing `await upload(pathname, file, { … });` call (lines 52-57) with:

```ts
        await upload(
          pathname,
          file,
          videoUploadOptions("/studio/api/blob-upload", ({ percentage }) =>
            setState({ phase: "uploading", percent: Math.round(percentage) }),
          ),
        );
```

- [ ] **Step 6: tsc** — `npx tsc --noEmit` → clean.

- [ ] **Step 7: Commit** — `git add lib/blob-upload-options.ts tests/lib/blob-upload-options.test.ts components/studio/video-upload.tsx && git commit -m "feat(studio): multipart Blob uploads so 200-500MB films upload reliably"`

---

## Task 2: `lib/delivery-url.ts` — pure validator + display helper (TDD)

**Files:** Create `tests/lib/delivery-url.test.ts`, `lib/delivery-url.ts`.

- [ ] **Step 1: Write the failing test** — `tests/lib/delivery-url.test.ts`:

```ts
/**
 * delivery-url — pure https validation + display helpers for the studio's
 * external delivery links (orders.proofUrl / finalVideoUrl). No DB.
 */
import { describe, expect, test } from "vitest";

import {
  normalizeDeliveryUrl,
  deliveryUrlHost,
  deliveryView,
} from "@/lib/delivery-url";

describe("normalizeDeliveryUrl", () => {
  test("accepts a well-formed https url, returning canonical href + host", () => {
    const r = normalizeDeliveryUrl("  https://drive.google.com/file/d/abc/view  ");
    expect(r).toEqual({
      ok: true,
      url: "https://drive.google.com/file/d/abc/view",
      host: "drive.google.com",
    });
  });
  test("rejects empty input", () => {
    expect(normalizeDeliveryUrl("   ")).toEqual({ ok: false, error: "Paste a link first." });
  });
  test("rejects non-https schemes", () => {
    for (const bad of ["http://x.com/a", "javascript:alert(1)", "data:text/html,x", "mailto:a@b.c"]) {
      expect(normalizeDeliveryUrl(bad).ok).toBe(false);
    }
  });
  test("rejects garbage that is not a url", () => {
    expect(normalizeDeliveryUrl("not a link").ok).toBe(false);
  });
});

describe("deliveryUrlHost", () => {
  test("returns the host for a valid https url", () => {
    expect(deliveryUrlHost("https://www.dropbox.com/s/x")).toBe("www.dropbox.com");
  });
  test("returns null for non-https / invalid / empty", () => {
    expect(deliveryUrlHost("http://x.com")).toBeNull();
    expect(deliveryUrlHost("nope")).toBeNull();
    expect(deliveryUrlHost(null)).toBeNull();
  });
});

describe("deliveryView", () => {
  const url = "https://drive.google.com/x";
  test("upload + link → upload-with-link", () => {
    expect(deliveryView(true, url)).toEqual({ mode: "upload-with-link", host: "drive.google.com" });
  });
  test("upload, no link → upload", () => {
    expect(deliveryView(true, null)).toEqual({ mode: "upload" });
  });
  test("no upload, link → link-only", () => {
    expect(deliveryView(false, url)).toEqual({ mode: "link-only", host: "drive.google.com" });
  });
  test("neither → none", () => {
    expect(deliveryView(false, null)).toEqual({ mode: "none" });
  });
  test("an unsafe stored url is treated as no link", () => {
    expect(deliveryView(false, "http://x.com")).toEqual({ mode: "none" });
    expect(deliveryView(true, "javascript:1")).toEqual({ mode: "upload" });
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `npx vitest run tests/lib/delivery-url.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `lib/delivery-url.ts`:

```ts
/**
 * delivery-url — pure validation + display helpers for the studio's external
 * delivery links (orders.proofUrl / finalVideoUrl). https-only; the link is
 * pasted by trusted staff and shown to the customer, so we canonicalize + refuse
 * unsafe schemes here and never render a non-https value. No DB. Tested in
 * tests/lib/delivery-url.test.ts.
 */
export type NormalizedDeliveryUrl =
  | { ok: true; url: string; host: string }
  | { ok: false; error: string };

/** Validate + canonicalize a pasted external delivery link. https only. */
export function normalizeDeliveryUrl(input: string): NormalizedDeliveryUrl {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Paste a link first." };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "That does not look like a valid link." };
  }
  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Links must start with https://" };
  }
  return { ok: true, url: parsed.href, host: parsed.host };
}

/** Host of a stored delivery URL, or null if it is not a safe https URL. */
export function deliveryUrlHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.host : null;
  } catch {
    return null;
  }
}

/** What a customer slot should render: the in-app upload, an external link, both, or nothing. */
export type DeliveryView =
  | { mode: "upload-with-link"; host: string }
  | { mode: "upload" }
  | { mode: "link-only"; host: string }
  | { mode: "none" };

export function deliveryView(
  hasUpload: boolean,
  url: string | null | undefined,
): DeliveryView {
  const host = deliveryUrlHost(url);
  if (hasUpload) return host ? { mode: "upload-with-link", host } : { mode: "upload" };
  return host ? { mode: "link-only", host } : { mode: "none" };
}
```

- [ ] **Step 4: Run it, confirm PASS** — `npx vitest run tests/lib/delivery-url.test.ts`.
- [ ] **Step 5: tsc** — `npx tsc --noEmit`.
- [ ] **Step 6: Commit** — `git add lib/delivery-url.ts tests/lib/delivery-url.test.ts && git commit -m "feat(lib): delivery-url https validator + display helpers (TDD)"`

---

## Task 3: Orders `proofUrl` + `finalVideoUrl` fields + migration

**Files:** Modify `collections/Orders.ts`, `migrations/index.ts`; Create `migrations/20260617_000001_orders_delivery_urls.ts`.

- [ ] **Step 1: Add the fields** — in `collections/Orders.ts`, immediately AFTER the `finalVideo` field object (the one with `name: "finalVideo"`, which closes with `},` before `name: "revisionNote"`) insert:

```ts
    {
      name: "proofUrl",
      type: "text",
      admin: {
        description:
          "External delivery link for the PREVIEW (e.g. Google Drive). A backup " +
          "so the parent always has a way to get it, or the delivery itself when " +
          "the file is too large to upload. Set from the studio workstation.",
      },
    },
    {
      name: "finalVideoUrl",
      type: "text",
      admin: {
        description:
          "External delivery link for the FINAL film (e.g. Google Drive). A backup " +
          "or the delivery itself when the file is too large to upload. Set from " +
          "the studio workstation.",
      },
    },
```

- [ ] **Step 2: Create the migration** — `migrations/20260617_000001_orders_delivery_urls.ts`:

```ts
import { type MigrateUpArgs, type MigrateDownArgs, sql } from "@payloadcms/db-postgres";

/**
 * Adds orders.proof_url + orders.final_video_url (text): the studio's external
 * delivery links for the preview and final film. Additive + idempotent; safe
 * against a dev-pushed schema. No index (never looked up by value).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "proof_url" text;
    ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "final_video_url" text;
  `);
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "final_video_url";
    ALTER TABLE "orders" DROP COLUMN IF EXISTS "proof_url";
  `);
}
```

- [ ] **Step 3: Register it** — in `migrations/index.ts`, add the import after the last existing import:

```ts
import * as migration_20260617_000001_orders_delivery_urls from "./20260617_000001_orders_delivery_urls";
```

and append as the LAST entry of the `migrations` array:

```ts
  {
    up: migration_20260617_000001_orders_delivery_urls.up,
    down: migration_20260617_000001_orders_delivery_urls.down,
    name: "20260617_000001_orders_delivery_urls",
  },
```

- [ ] **Step 4: tsc** — `npx tsc --noEmit` → clean.
- [ ] **Step 5: Commit** — `git add collections/Orders.ts migrations/20260617_000001_orders_delivery_urls.ts migrations/index.ts && git commit -m "feat(orders): proofUrl + finalVideoUrl delivery-link fields + migration"`

> Do NOT run the migration by hand; prod applies it via migrate-on-boot, dev/test via schema-push.

---

## Task 4: Studio core + action + widened guardrail (TDD)

**Files:** Modify `lib/studio-order-mutations.ts`, `lib/studio-actions.ts`, `tests/studio/actions.test.ts`.

- [ ] **Step 1: Write the failing tests** — append to `tests/studio/actions.test.ts` (follow the existing file's imports + `seedOrder` helper, which returns `{ payload, order }`; add `setDeliveryUrl` to the existing `@/lib/studio-actions` import if the file imports actions, OR import the core directly as the other core tests do — match the file's existing style). Add this describe block:

```ts
describe("delivery links (applyDeliveryUrlCore + widened guardrail)", () => {
  test("stores a valid https link on proofUrl, rejects an invalid one", async () => {
    const { payload, order } = await seedOrder("in_production");

    const ok = await applyDeliveryUrlCore(String(order.id), "proof", "https://drive.google.com/x");
    expect(ok).toEqual({ ok: true });
    let after = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    expect(after.proofUrl).toBe("https://drive.google.com/x");

    const bad = await applyDeliveryUrlCore(String(order.id), "proof", "ftp://nope");
    expect(bad.ok).toBe(false);
    after = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    expect(after.proofUrl).toBe("https://drive.google.com/x"); // unchanged
  });

  test("null clears the link", async () => {
    const { payload, order } = await seedOrder("in_production");
    await applyDeliveryUrlCore(String(order.id), "finalVideo", "https://www.dropbox.com/s/x");
    await applyDeliveryUrlCore(String(order.id), "finalVideo", null);
    const after = await payload.findByID({ collection: "orders", id: order.id, depth: 0, overrideAccess: true });
    expect(after.finalVideoUrl ?? null).toBeNull();
  });

  test("a proofUrl alone satisfies the proof_ready guardrail (no uploaded proof)", async () => {
    const { order } = await seedOrder("in_production");
    await applyDeliveryUrlCore(String(order.id), "proof", "https://drive.google.com/x");
    const result = await applyOrderStatusCore(String(order.id), "proof_ready");
    expect(result).toEqual({ ok: true });
  });

  test("a finalVideoUrl alone satisfies the delivered guardrail (no uploaded film)", async () => {
    const { order } = await seedOrder("proof_ready");
    await applyDeliveryUrlCore(String(order.id), "finalVideo", "https://drive.google.com/x");
    const result = await applyOrderStatusCore(String(order.id), "delivered");
    expect(result).toEqual({ ok: true });
  });

  test("neither an upload nor a link still rejects proof_ready", async () => {
    const { order } = await seedOrder("in_production");
    const result = await applyOrderStatusCore(String(order.id), "proof_ready");
    expect(result.ok).toBe(false);
  });
});
```

Add `applyDeliveryUrlCore` to the existing `@/lib/studio-order-mutations` import in the test file (alongside `applyOrderStatusCore`).

- [ ] **Step 2: Run them, confirm they fail** — `npx vitest run tests/studio/actions.test.ts` → FAIL (`applyDeliveryUrlCore` undefined; link-only guardrail rejects).

- [ ] **Step 3: Add the core + widen the guardrail** — in `lib/studio-order-mutations.ts`:

Add the import after the existing imports (after line 23):

```ts
import { normalizeDeliveryUrl } from "@/lib/delivery-url";
```

Replace the guardrail block in `applyOrderStatusCore` (the two `if (requirement === …)` blocks, lines ~55-67) with:

```ts
  const requirement = requirementFor(nextStatus);
  if (requirement === "proof" && !order.proof && !order.proofUrl) {
    return {
      ok: false,
      error: "Add a preview film or a delivery link before sharing the proof with the parent.",
    };
  }
  if (requirement === "finalVideo" && !order.finalVideo && !order.finalVideoUrl) {
    return {
      ok: false,
      error: "Add the final film or a delivery link before marking the order delivered.",
    };
  }
```

Add the new core after `applyPromisedByCore` (before `export type VideoKind`):

```ts
/**
 * Core: set (validated https URL) or clear (null) an order's external delivery
 * link for the preview (kind "proof" → proofUrl) or final film (kind
 * "finalVideo" → finalVideoUrl). Auth-skipping ON PURPOSE (DB tests) — the
 * action wraps it with requireStudioUserOrRedirect.
 */
export async function applyDeliveryUrlCore(
  orderId: string,
  kind: VideoKind,
  rawUrl: string | null,
): Promise<StudioActionResult> {
  const field = kind === "proof" ? "proofUrl" : "finalVideoUrl";
  let value: string | null = null;
  if (rawUrl !== null && rawUrl.trim() !== "") {
    const normalized = normalizeDeliveryUrl(rawUrl);
    if (!normalized.ok) return { ok: false, error: normalized.error };
    value = normalized.url;
  }
  const payload = await getPayloadClient();
  try {
    await payload.update({
      collection: "orders",
      id: orderId,
      data: { [field]: value },
      overrideAccess: true,
    });
  } catch (err) {
    if (err instanceof NotFound) {
      return { ok: false, error: "We could not find that order." };
    }
    throw err;
  }
  return { ok: true };
}
```

> Note: `VideoKind` is declared later in the file (`export type VideoKind = "proof" | "finalVideo";`). TypeScript hoists type declarations, so referencing it above its declaration is fine. If the engineer prefers, move the `VideoKind` type up to just under `StudioActionResult` — either is acceptable.

- [ ] **Step 4: Add the action** — in `lib/studio-actions.ts`, add `applyDeliveryUrlCore` to the existing `@/lib/studio-order-mutations` import, then add the action after `setPromisedBy`:

```ts
/** Action: staff set/clear the external delivery link for the preview or final film. */
export async function setDeliveryUrl(
  orderId: string,
  kind: VideoKind,
  rawUrl: string | null,
): Promise<StudioActionResult> {
  await requireStudioUserOrRedirect();
  try {
    const result = await applyDeliveryUrlCore(orderId, kind, rawUrl);
    if (result.ok) revalidateStudioAndCustomer(orderId);
    return result;
  } catch (err) {
    console.error("[studio] setDeliveryUrl failed:", err);
    return { ok: false, error: GENERIC_ERROR };
  }
}
```

(`VideoKind`, `StudioActionResult`, `applyDeliveryUrlCore` all come from the existing `@/lib/studio-order-mutations` import; `requireStudioUserOrRedirect`, `revalidateStudioAndCustomer`, `GENERIC_ERROR` already exist in this file.)

- [ ] **Step 5: Run + tsc** — `npx vitest run tests/studio/actions.test.ts && npx tsc --noEmit` → green/clean.
- [ ] **Step 6: Commit** — `git add lib/studio-order-mutations.ts lib/studio-actions.ts tests/studio/actions.test.ts && git commit -m "feat(studio): delivery-link core + action; status guardrail accepts upload OR link"`

---

## Task 5: Studio `DeliveryLinkEditor` + mount

**Files:** Create `components/studio/delivery-link-editor.tsx`; Modify `app/(site)/studio/(gated)/orders/[id]/page.tsx`.

- [ ] **Step 1: Build the editor** — `components/studio/delivery-link-editor.tsx` (mirrors `components/studio/promised-by-editor.tsx`):

```tsx
"use client";

/**
 * DeliveryLinkEditor — paste an external https delivery link (Google Drive /
 * Dropbox / WeTransfer) for the preview or final film. A backup so the parent
 * always has a way to get the film, or the delivery itself when the file is too
 * large to upload here. Saving validates + stores; the status guardrail accepts
 * either an uploaded file or a saved link.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setDeliveryUrl } from "@/lib/studio-actions";
import { deliveryUrlHost } from "@/lib/delivery-url";
import type { VideoKind } from "@/lib/studio-order-mutations";

export function DeliveryLinkEditor({
  orderId,
  kind,
  current,
}: {
  orderId: string;
  kind: VideoKind;
  current: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const savedHost = deliveryUrlHost(current);

  function save(next: string | null) {
    setMessage(null);
    startTransition(async () => {
      const result = await setDeliveryUrl(orderId, kind, next);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: next ? "Link saved." : "Link cleared." });
      router.refresh();
    });
  }

  return (
    <div className="mt-4 border-t-2 border-dashed border-brand-deep/15 pt-4">
      <label
        htmlFor={`delivery-${kind}`}
        className="text-sm font-bold text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        Or share a delivery link
      </label>
      <p className="mt-1 text-xs text-brand-deep/60">
        Paste a Google Drive, Dropbox, or WeTransfer link. Use it as a backup so the
        parent always has a way to get the film — or as the delivery itself when the
        file is too large to upload here.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          id={`delivery-${kind}`}
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border-2 border-brand-deep bg-brand-cream px-3 py-2 text-sm text-brand-deep placeholder:text-brand-deep/30"
        />
        <button
          type="button"
          disabled={pending || value.trim() === (current ?? "")}
          aria-busy={pending}
          onClick={() => save(value.trim() || null)}
          className="rounded-full border-2 border-brand-deep bg-brand-blue px-4 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {current ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setValue("");
              save(null);
            }}
            className="rounded-full border-2 border-brand-deep/40 bg-white px-3 py-2 text-xs font-bold text-brand-deep/60 hover:shadow-comic-sm disabled:opacity-50"
          >
            Clear
          </button>
        ) : null}
      </div>

      {savedHost ? (
        <p className="mt-2 text-xs text-brand-deep/60">
          Saved:{" "}
          <a
            href={current!}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            {savedHost} ↗
          </a>
        </p>
      ) : null}

      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`mt-2 text-xs font-semibold ${
            message.kind === "error" ? "text-rose-700" : "text-brand-deep/60"
          }`}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Mount it under each upload slot** — in `app/(site)/studio/(gated)/orders/[id]/page.tsx`:

Add the import after the `VideoUpload` import (line 21):

```ts
import { DeliveryLinkEditor } from "@/components/studio/delivery-link-editor";
```

Wrap each `VideoUpload` so its `DeliveryLinkEditor` sits with it. Replace the two `<VideoUpload … />` elements (lines 305-324) with:

```tsx
          <div>
            <VideoUpload
              orderId={String(order.id)}
              kind="proof"
              title="Preview film"
              hint="Sharing the proof emails the parent automatically."
              blobEnabled={isBlobStorageEnabled()}
              current={proof ? { filename: proof.filename ?? null, url: proof.url ?? null } : null}
            />
            <DeliveryLinkEditor
              orderId={String(order.id)}
              kind="proof"
              current={(order.proofUrl as string | null) ?? null}
            />
          </div>
          <div>
            <VideoUpload
              orderId={String(order.id)}
              kind="finalVideo"
              title="Final film"
              hint="Marking the order delivered emails the parent automatically."
              blobEnabled={isBlobStorageEnabled()}
              current={
                finalVideo
                  ? { filename: finalVideo.filename ?? null, url: finalVideo.url ?? null }
                  : null
              }
            />
            <DeliveryLinkEditor
              orderId={String(order.id)}
              kind="finalVideo"
              current={(order.finalVideoUrl as string | null) ?? null}
            />
          </div>
```

(The editor renders inside the same card visual flow; its top border-divider separates it from the upload control above.)

- [ ] **Step 3: tsc** — `npx tsc --noEmit` → clean.
- [ ] **Step 4: Commit** — `git add components/studio/delivery-link-editor.tsx "app/(site)/studio/(gated)/orders/[id]/page.tsx" && git commit -m "feat(studio): delivery-link editor on the order workstation (per slot)"`

---

## Task 6: Customer display — show the link

**Files:** Modify `components/app/video-player.tsx`, `components/app/proof-review.tsx`, `app/(site)/(app)/app/orders/[id]/page.tsx`.

- [ ] **Step 1: Final film** — in `components/app/video-player.tsx`:

Add the import at the top:

```ts
import { deliveryView } from "@/lib/delivery-url";
```

Add `finalVideoUrl` to the props interface:

```ts
interface VideoPlayerProps {
  orderId: string;
  childName?: string;
  /** False when the order is delivered but finalVideo is not attached yet. */
  hasVideo: boolean;
  /** External delivery link (Google Drive etc.), if the studio set one. */
  finalVideoUrl?: string | null;
}
```

Change the function signature + compute the view, and render the link. Replace the whole component body return with this (keeps the header; the body now branches on `deliveryView`):

```tsx
export function VideoPlayer({ orderId, childName, hasVideo, finalVideoUrl }: VideoPlayerProps) {
  const subject = childName?.trim() || "your child";
  const src = `/api/orders/${orderId}/video`;
  const view = deliveryView(hasVideo, finalVideoUrl ?? null);
  const hasSomething = view.mode !== "none";

  return (
    <div
      className="mt-5 rounded-2xl border-2 border-brand-deep bg-brand-cream p-5"
      data-action-slot="delivered"
    >
      <h3 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        {childName ? `${childName}'s fairy tale is ready` : "Your fairy tale is ready"}
      </h3>
      <p className="mt-1 text-sm text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
        {hasSomething
          ? "Find a cozy spot and watch it together. It is yours to keep, again and again."
          : "We are adding the final touches to their film. It will appear here very soon."}
      </p>

      {hasVideo ? (
        <>
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-brand-deep bg-brand-deep">
            <video
              src={src}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full"
              aria-label={`${subject}'s finished fairy tale`}
            />
          </div>
          <div className="mt-4">
            <a
              href={`${src}?download`}
              download
              className="inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Download the film
            </a>
          </div>
        </>
      ) : null}

      {view.mode === "upload-with-link" ? (
        <p className="mt-3 text-sm text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          Prefer to download it from {view.host}?{" "}
          <a
            href={finalVideoUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            Open the link ↗
          </a>
        </p>
      ) : null}

      {view.mode === "link-only" ? (
        <div className="mt-4">
          <a
            href={finalVideoUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {childName ? `Open ${childName}'s film on ${view.host} ↗` : `Open the film on ${view.host} ↗`}
          </a>
        </div>
      ) : null}

      {view.mode === "none" ? (
        <div
          className="mt-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-brand-deep/30 bg-white px-5 py-10 text-center text-sm text-brand-deep/60"
          style={{ fontFamily: "var(--font-quicksand)" }}
        >
          Your video is being finalized.
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Preview** — in `components/app/proof-review.tsx`:

Add the import:

```ts
import { deliveryUrlHost } from "@/lib/delivery-url";
```

Add `proofUrl` to `ProofReviewProps`:

```ts
interface ProofReviewProps {
  orderId: string;
  childName?: string;
  proof?: ProofMedia | null;
  /** External delivery link for the preview, if the studio set one. */
  proofUrl?: string | null;
  readOnly?: boolean;
}
```

Update the destructure to include `proofUrl`, and compute the host near the other derived values (after `const isImage = …;`):

```ts
  const linkHost = deliveryUrlHost(proofUrl ?? null);
```

In the proof-media `<div>` (the `{proof?.url && isVideo ? … : … }` chain), change the FINAL `else` (the "Your preview is on its way" `<p>`, lines ~118-125) so a link shows when there is no uploaded proof but a delivery link exists:

```tsx
        ) : linkHost ? (
          <a
            href={proofUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-5 py-8 font-semibold text-brand-deep underline"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Open your preview on {linkHost} ↗
          </a>
        ) : (
          <p
            className="px-5 py-8 text-center text-sm text-brand-deep/60"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Your preview is on its way. Check back in a moment.
          </p>
        )}
```

And, immediately AFTER the closing `</div>` of that proof-media block (before the `{error ? … }` block), add a secondary link line shown when the in-app proof IS present AND a delivery link also exists:

```tsx
      {proof?.url && linkHost ? (
        <p className="mt-2 text-xs text-brand-deep/60" style={{ fontFamily: "var(--font-quicksand)" }}>
          Also available on {linkHost}:{" "}
          <a
            href={proofUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            open the link ↗
          </a>
        </p>
      ) : null}
```

- [ ] **Step 3: Pass the fields through** — in `app/(site)/(app)/app/orders/[id]/page.tsx`, in the `ActionSlot` function, pass the new props:

For `proof_ready`:
```tsx
        <ProofReview
          orderId={String(order.id)}
          childName={childName}
          proof={proof}
          proofUrl={(order.proofUrl as string | null) ?? null}
        />
```
For `revisions` (add the same `proofUrl` prop alongside `readOnly`):
```tsx
        <ProofReview
          orderId={String(order.id)}
          childName={childName}
          proof={proof}
          proofUrl={(order.proofUrl as string | null) ?? null}
          readOnly
        />
```
For `delivered`:
```tsx
        <VideoPlayer
          orderId={String(order.id)}
          childName={childName}
          hasVideo={Boolean(order.finalVideo)}
          finalVideoUrl={(order.finalVideoUrl as string | null) ?? null}
        />
```

- [ ] **Step 4: tsc + affected tests** — `npx tsc --noEmit && npx vitest run tests/lib/delivery-url.test.ts` → clean/green.
- [ ] **Step 5: Commit** — `git add components/app/video-player.tsx components/app/proof-review.tsx "app/(site)/(app)/app/orders/[id]/page.tsx" && git commit -m "feat(app): show the external delivery link on the customer order page"`

---

## Task 7: Verify + Mind maintenance

**Files:** Modify `fairy-tale-mind/map/zones/studio.md`, `fairy-tale-mind/map/zones/payload-backend.md` (and `auth-gating.md` — it owns the customer components changed in Task 6); optionally create a decision record.

- [ ] **Step 1: Full suite** — `npm test`. Expected: all green (DB-backed; minutes). Investigate any failure before continuing.
- [ ] **Step 2: Update `studio` zone** — in `fairy-tale-mind/map/zones/studio.md`:
  - Change the guardrail invariant `rule:` from "proof_ready requires a proof attached; delivered requires the final film — server-enforced, not just disabled buttons." to: "proof_ready requires a proof **or an external delivery link** (proofUrl); delivered requires the final film **or a delivery link** (finalVideoUrl) — server-enforced, not just disabled buttons." (keep `enforcedBy: ["tests/studio/actions.test.ts"]`).
  - Add to `owns.globs`: `lib/delivery-url.ts`, `lib/blob-upload-options.ts`, `components/studio/delivery-link-editor.tsx`, `tests/lib/delivery-url.test.ts`, `tests/lib/blob-upload-options.test.ts`.
  - Add a one-paragraph body note under the Video-uploads bullet: multipart Blob uploads (large films) + the per-slot external delivery link (backup or stand-alone; `lib/delivery-url.ts` validates https; customer sees it via `deliveryView`).
  - Set `verifiedAt` to the current HEAD (`git rev-parse --short HEAD`).
- [ ] **Step 3: Update `payload-backend` zone** — add the migration to `owns.globs`: `migrations/20260617_000001_orders_delivery_urls.ts`; add a one-line lineage note (orders gained `proof_url` + `final_video_url`); set `verifiedAt` to HEAD.
- [ ] **Step 4: Re-stamp `auth-gating`** — it owns `components/app/video-player.tsx` + `components/app/proof-review.tsx` (changed in Task 6) and `app/(site)/(app)/app/orders/[id]/page.tsx`: add a one-line lineage note (the delivered/preview slots now also surface an external delivery link) and set `verifiedAt` to HEAD.
- [ ] **Step 5: Optional decision record** — `fairy-tale-mind/map/decisions/2026-06-17-studio-delivery-link.md` capturing the "guardrail accepts upload OR link" choice + the any-https (no allowlist) trust model. Short.
- [ ] **Step 6: Regenerate + commit** — `npm run mind` (expect the 2 pre-existing stale unchanged; `studio`/`payload-backend`/`auth-gating` fresh). `git add fairy-tale-mind/ && git commit -m "docs(mind): studio video delivery — large uploads + delivery link; zone re-stamps"`

---

## Self-Review

**1. Spec coverage:**
- §1 multipart uploads → Task 1. §2 data + validator → Tasks 2, 3. §3 studio input + guardrail → Tasks 4, 5. §4 customer display → Task 6. §5 error handling → covered in Tasks 4 (guardrail messages, invalid-url reject), 5 (editor inline error), 6 (defensive `deliveryUrlHost` re-validation). §6 testing → Tasks 1, 2, 4 (the customer-display logic is tested via the pure `deliveryView`/`deliveryUrlHost` in Task 2 rather than DOM assertions — faithful to the repo's "pure core, thin component" convention; noted as a deliberate refinement of the spec's "node-env component assertions"). §7 Mind → Task 7. §8 out-of-scope respected (no managed host, no resumable lib, no allowlist, no email re-send, no read receipt).

**2. Placeholders:** none — every code step has full content; the migration date is the stamp convention; Task 4 Step 1 says "follow the existing file's `seedOrder` helper" because the test file's fixtures must be reused, but gives the exact new test bodies and the exact helper shape (`{ payload, order }`).

**3. Type/name consistency:** `videoUploadOptions`/`VideoUploadOptions` (Task 1) consistent. `normalizeDeliveryUrl`/`deliveryUrlHost`/`deliveryView`/`DeliveryView` defined in Task 2 and consumed in Tasks 4 (normalize), 5 (host), 6 (view, host). `applyDeliveryUrlCore(orderId, kind: VideoKind, rawUrl)` and `setDeliveryUrl(orderId, kind: VideoKind, rawUrl)` match across Tasks 4 + 5. Field names `proofUrl`/`finalVideoUrl` ↔ columns `proof_url`/`final_video_url` consistent across Tasks 3, 4, 5, 6. `VideoKind` ("proof" | "finalVideo") reused everywhere — `kind === "proof" ? "proofUrl" : "finalVideoUrl"`. `deliveryView` modes (`upload-with-link`/`upload`/`link-only`/`none`) match between Task 2's definition and Task 6's branches.
