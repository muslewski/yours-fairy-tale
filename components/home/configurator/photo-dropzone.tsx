import { useRef, useState } from "react";
import { validateUploadFile } from "@/lib/order-upload-validation";

type Pic = { file: File; url: string };

export function PhotoDropzone() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pics, setPics] = useState<Pic[]>([]);
  const [error, setError] = useState<string | null>(null);

  function add(list: FileList | null) {
    setError(null);
    const picked = Array.from(list ?? []);
    for (const f of picked) {
      const check = validateUploadFile(f);
      if (!check.ok) return setError(check.error);
    }
    setPics((prev) => [...prev, ...picked.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }
  function remove(i: number) {
    setPics((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  return (
    <div className="mt-5">
      <label
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-[3px] border-dashed border-brand-deep/40 bg-brand-cream px-5 py-8 text-center transition-colors hover:border-brand-deep"
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
        <span className="font-[family-name:var(--font-fredoka)] text-lg font-semibold text-brand-deep">
          Drag photos here, or choose files
        </span>
        <span className="mt-1 text-sm font-medium text-brand-deep/60">JPEG, PNG, or HEIC, up to 15 MB each</span>
      </label>

      {error ? <p role="alert" className="mt-3 text-sm font-bold text-brand-pink">{error}</p> : null}

      {pics.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3">
          {pics.map((p, i) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- transient blob: object URL, not a remote asset */}
              <img src={p.url} alt="" className="h-20 w-20 rounded-xl border-[3px] border-brand-deep object-cover" />
              <button
                type="button" onClick={() => remove(i)} aria-label="Remove photo"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-brand-deep bg-white text-xs font-black text-brand-deep"
              >×</button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-4 rounded-xl border-[3px] border-brand-deep bg-brand-yellow/40 px-4 py-3 text-sm font-semibold text-brand-deep">
        You&apos;ll upload these in your dashboard right after checkout, so we can attach them to your order. Adding them here is just a preview.
      </p>
    </div>
  );
}
