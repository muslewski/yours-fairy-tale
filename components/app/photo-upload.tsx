"use client";

/**
 * PhotoUpload — the awaiting_assets action (Task 4.2).
 *
 * A parent picks a few photos of their child and sends them. The component
 * validates type/size client-side for instant feedback (shared predicate with
 * the server action), shows a sending state, and surfaces a clear error if the
 * server rejects the batch. On success it shows a brief confirmation; the page
 * revalidates server-side (the order advances to "in the studio"), so the slot
 * itself goes away on the next render.
 *
 * Motion is guarded by useReducedMotion(): the only animation is a gentle
 * confirmation fade, dropped to an instant state change when reduced motion is
 * preferred.
 */
import { useRef, useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";

import { uploadOrderAssets } from "@/lib/order-actions";
import { validateUploadFile } from "@/lib/order-upload-validation";
import { prepareForUpload } from "@/components/app/prepare-upload";

interface PhotoUploadProps {
  orderId: string;
  childName?: string;
}

export function PhotoUpload({ orderId, childName }: PhotoUploadProps) {
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const subject = childName?.trim() || "your child";

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setDone(null);
    const picked = Array.from(event.target.files ?? []);
    for (const file of picked) {
      const check = validateUploadFile(file);
      if (!check.ok) {
        setError(check.error);
        setFiles([]);
        return;
      }
    }
    setFiles(picked);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0 || pending) return;
    setError(null);
    setDone(null);

    startTransition(async () => {
      let added = 0;
      for (const file of files) {
        const prepared = await prepareForUpload(file);
        if (!prepared.ok) {
          setError(prepared.error);
          return;
        }
        // One file per request keeps every call under the platform body cap.
        const formData = new FormData();
        formData.append("files", prepared.file);
        const result = await uploadOrderAssets(orderId, formData);
        if (result.error) {
          setError(
            added > 0
              ? `We saved ${added} photo${added === 1 ? "" : "s"}, then hit a snag. ${result.error}`
              : result.error,
          );
          return;
        }
        added += result.added;
      }
      setDone(added);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-5 rounded-2xl border-2 border-brand-deep bg-brand-cream p-5"
      data-action-slot="awaiting_assets"
    >
      <h3
        className="text-lg text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        Add a few photos of {subject}
      </h3>
      <p
        className="mt-1 text-sm text-brand-deep/70"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        A handful of clear, well-lit pictures is all we need. We use them only to
        give the hero {subject}&rsquo;s real likeness, and we keep them private.
      </p>

      <label
        className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand-deep/40 bg-white px-5 py-6 text-center transition-colors hover:border-brand-deep"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        <input
          ref={inputRef}
          type="file"
          name="files"
          accept="image/*"
          multiple
          onChange={onPick}
          disabled={pending}
          className="sr-only"
        />
        <span className="font-semibold text-brand-deep">
          {files.length > 0
            ? `${files.length} photo${files.length === 1 ? "" : "s"} ready`
            : "Choose photos"}
        </span>
        <span className="mt-1 text-sm text-brand-deep/60">
          JPEG, PNG, or HEIC, up to 15 MB each
        </span>
      </label>

      {error ? (
        <p
          className="mt-3 text-sm font-semibold text-brand-pink"
          style={{ fontFamily: "var(--font-quicksand)" }}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {done !== null ? (
        <motion.p
          className="mt-3 text-sm font-semibold text-brand-deep"
          style={{ fontFamily: "var(--font-quicksand)" }}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
        >
          Thank you. We have {done} photo{done === 1 ? "" : "s"}, and we are
          getting started.
        </motion.p>
      ) : null}

      <button
        type="submit"
        disabled={files.length === 0 || pending}
        className="mt-4 inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:cursor-not-allowed disabled:opacity-50"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        {pending ? "Sending photos" : "Send photos"}
      </button>
    </form>
  );
}
