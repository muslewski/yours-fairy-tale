"use client";

/**
 * PromisedByEditor — the delivery promise the parent sees. A date input with
 * +1 week / +2 weeks presets (FROM TODAY, the moment the studio clicks).
 * Saving writes UTC noon of the chosen day so timezone wobble never moves the
 * promise across a date line.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setPromisedBy } from "@/lib/studio-actions";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function plusDaysFromToday(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function PromisedByEditor({
  orderId,
  promisedBy,
}: {
  orderId: string;
  promisedBy: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(toDateInputValue(promisedBy));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function save(next: string) {
    setMessage(null);
    startTransition(async () => {
      const iso = next ? `${next}T12:00:00.000Z` : null;
      const result = await setPromisedBy(orderId, iso);
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "ok", text: next ? "Promise updated." : "Promise cleared." });
      router.refresh();
    });
  }

  return (
    <section
      aria-label="Delivery promise"
      className="rounded-3xl border-2 border-brand-deep bg-white p-5 shadow-comic"
    >
      <h2 className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
        Promised by
      </h2>
      <p className="mt-1 text-xs text-brand-deep/60">
        The parent sees a countdown to this date. Move it if plans change.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Promised delivery date"
          className="rounded-xl border-2 border-brand-deep bg-brand-cream px-3 py-2 text-sm font-semibold text-brand-deep"
        />
        <button
          type="button"
          disabled={pending || !value}
          onClick={() => save(value)}
          className="rounded-full border-2 border-brand-deep bg-brand-blue px-4 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-50"
        >
          Save
        </button>
      </div>

      <div className="mt-2 flex gap-2 text-xs font-bold">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = plusDaysFromToday(7);
            setValue(next);
            save(next);
          }}
          className="rounded-full border-2 border-brand-deep bg-white px-3 py-1 text-brand-deep hover:shadow-comic-sm"
        >
          +1 week
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            const next = plusDaysFromToday(14);
            setValue(next);
            save(next);
          }}
          className="rounded-full border-2 border-brand-deep bg-white px-3 py-1 text-brand-deep hover:shadow-comic-sm"
        >
          +2 weeks
        </button>
        <button
          type="button"
          disabled={pending || !value}
          onClick={() => {
            setValue("");
            save("");
          }}
          className="rounded-full border-2 border-brand-deep/40 bg-white px-3 py-1 text-brand-deep/60 hover:shadow-comic-sm disabled:opacity-50"
        >
          Clear
        </button>
      </div>

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
    </section>
  );
}
