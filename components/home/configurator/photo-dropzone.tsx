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
      setError(
        `You can add up to ${MAX_CHECKOUT_PHOTOS} photos. Please choose ${remaining} or fewer.`,
      );
      return;
    }
    setBusy(true);
    const addedPaths: string[] = [];
    const addedItems: Item[] = [];
    try {
      let i = 0;
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
        const ext =
          prepared.file.type === "image/png"
            ? "png"
            : prepared.file.type === "image/webp"
              ? "webp"
              : "jpg";
        // addRandomSuffix on the server makes the final pathname unique; this is the prefix.
        const blob = await upload(`configurator/${Date.now()}-${i}-${ext}`, prepared.file, {
          access: "public",
          handleUploadUrl: "/api/configurator/blob-upload",
        });
        addedItems.push({ pathname: blob.pathname, url: URL.createObjectURL(prepared.file) });
        addedPaths.push(blob.pathname);
        i += 1;
      }
    } catch {
      setError("We couldn't upload that photo. Please try again in a moment.");
    } finally {
      if (addedItems.length > 0) {
        setItems((prev) => [...prev, ...addedItems]);
        onChange([...value, ...addedPaths]);
      }
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
        onDrop={(e) => {
          e.preventDefault();
          if (!busy && remaining > 0) add(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
        aria-disabled={busy || remaining <= 0}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-brand-deep/40 bg-brand-cream px-5 py-8 text-center transition-colors hover:border-brand-deep aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
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
          {busy
            ? "Uploading…"
            : remaining > 0
              ? "Drag photos here, or choose files"
              : "That's the most we need"}
        </span>
        <span className="mt-1 text-sm font-medium text-brand-deep/60">
          JPEG, PNG, or HEIC, up to 15 MB each. Up to {MAX_CHECKOUT_PHOTOS}.
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-bold text-brand-pink">
          {error}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {items.map((p, i) => (
            <li key={p.pathname} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- transient object URL */}
              <img
                src={p.url}
                alt=""
                className="h-20 w-20 rounded-xl border-[3px] border-brand-deep object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-brand-deep bg-white text-xs font-black text-brand-deep"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 text-sm font-medium text-brand-deep/60">
        Photos are optional now. You can also add them from your dashboard after checkout.
      </p>
    </div>
  );
}
