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
