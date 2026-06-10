"use client";

/**
 * VideoUpload — one slot (proof or final film).
 *
 * Blob mode (token set): browser → Vercel Blob via @vercel/blob/client upload()
 * with a token minted by /studio/api/blob-upload, then attachUploadedVideo
 * registers + links it. The server never carries the bytes.
 * Local-dev mode: a plain server-action upload (no body cap off Vercel).
 *
 * Unique pathname per attempt (orderId-kind-timestamp.ext) — retries can never
 * collide; replaced videos just relink (old blobs stay orphaned, see tech-debt).
 */
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

import { attachUploadedVideo, uploadVideoDirect } from "@/lib/studio-actions";
import type { VideoKind } from "@/lib/studio-order-mutations";

export function VideoUpload({
  orderId,
  kind,
  title,
  hint,
  blobEnabled,
  current,
}: {
  orderId: string;
  kind: VideoKind;
  title: string;
  hint?: string;
  blobEnabled: boolean;
  current: { filename: string | null; url: string | null } | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<
    | { phase: "idle" }
    | { phase: "uploading"; percent: number }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  async function handleFile(file: File) {
    setState({ phase: "uploading", percent: 0 });
    try {
      if (blobEnabled) {
        const ext = file.name.includes(".")
          ? file.name.split(".").pop()
          : "mp4";
        const pathname = `${orderId}-${kind === "proof" ? "proof" : "final"}-${Date.now()}.${ext}`;
        await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/studio/api/blob-upload",
          onUploadProgress: ({ percentage }) =>
            setState({ phase: "uploading", percent: Math.round(percentage) }),
        });
        const result = await attachUploadedVideo({ orderId, kind, pathname });
        if (!result.ok) {
          setState({ phase: "error", message: result.error });
          return;
        }
      } else {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadVideoDirect(orderId, kind, formData);
        if (!result.ok) {
          setState({ phase: "error", message: result.error });
          return;
        }
      }
      setState({ phase: "idle" });
      router.refresh();
    } catch (err) {
      console.error("[studio] upload failed:", err);
      setState({
        phase: "error",
        message: "The upload did not finish. Please try again.",
      });
    }
  }

  return (
    <section
      aria-label={title}
      className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
    >
      <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        {title}
      </h2>

      {current?.filename ? (
        <p className="mt-2 break-all text-sm text-brand-deep/70">
          <span className="font-bold">{current.filename}</span>
          {current.url ? (
            <>
              {" · "}
              <a
                href={current.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${title.toLowerCase()} (opens in a new tab)`}
                className="underline-offset-4 hover:underline"
              >
                open ↗
              </a>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm text-brand-deep/60">Nothing attached yet.</p>
      )}
      {hint ? <p className="mt-1 text-xs text-brand-deep/50">{hint}</p> : null}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <div className="mt-3">
        {state.phase === "uploading" ? (
          <div>
            <div className="h-3 overflow-hidden rounded-full border-2 border-brand-deep bg-brand-cream">
              <div
                className="h-full bg-brand-blue transition-[width]"
                style={{ width: `${state.percent}%` }}
              />
            </div>
            <p role="status" className="mt-1 text-xs font-semibold text-brand-deep/60">
              Uploading… {state.percent}%
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full border-2 border-brand-deep bg-brand-yellow px-5 py-2.5 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {current?.filename ? "Replace the film" : "Upload a film"}
          </button>
        )}
      </div>

      {state.phase === "error" ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
