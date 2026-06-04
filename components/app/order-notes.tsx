"use client";

/**
 * OrderNotes — the customer's note thread for one order, plus an "Add a note"
 * dialog. Renders existing notes (passed from the server page) as a chronological
 * log, and a Motion modal with a textarea that calls the addOrderNote server
 * action. Available at any status. Motion is reduced-motion-guarded; the dialog
 * closes on Escape, backdrop click, or a successful send.
 */
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { addOrderNote } from "@/lib/order-actions";
import { MAX_NOTE_LENGTH } from "@/lib/order-notes-shared";

export interface CustomerNote {
  message: string;
  createdAt?: string | null;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function OrderNotes({
  orderId,
  notes,
}: {
  orderId: string;
  notes: CustomerNote[];
}) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
  }

  function submit() {
    const trimmed = message.trim();
    if (trimmed.length === 0) {
      setError("Please write a note before sending.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addOrderNote(orderId, trimmed);
      if (result.ok) {
        setMessage("");
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
          Notes for our studio
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full border-2 border-brand-deep bg-brand-yellow px-4 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Add a note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-brand-deep/70" style={{ fontFamily: "var(--font-quicksand)" }}>
          No notes yet. Add anything that will help us tell their story — a nickname, a favorite
          color, a detail to include.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note, i) => (
            <li
              key={i}
              className="rounded-2xl border-2 border-brand-deep bg-brand-cream p-4"
            >
              <p
                className="whitespace-pre-wrap text-brand-deep"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                {note.message}
              </p>
              {formatDate(note.createdAt) ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-deep/50">
                  {formatDate(note.createdAt)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="absolute inset-0 bg-brand-deep/40"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Add a note for the studio"
              onKeyDown={(e) => {
                if (e.key === "Escape") close();
              }}
              initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
              animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 16, scale: 0.97 }}
              className="relative z-10 w-full max-w-lg rounded-3xl border-2 border-brand-deep bg-white p-6 shadow-comic md:p-8"
            >
              <h3
                className="text-xl text-brand-deep"
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                Add a note for the studio
              </h3>
              <p
                className="mt-1 text-sm text-brand-deep/70"
                style={{ fontFamily: "var(--font-quicksand)" }}
              >
                Anything that helps us tell their story. We read every note.
              </p>
              <textarea
                autoFocus
                value={message}
                maxLength={MAX_NOTE_LENGTH}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="For example: she has a little brother, Max, and loves dinosaurs."
                className="mt-4 w-full rounded-2xl border-2 border-brand-deep bg-brand-cream p-3 text-brand-deep outline-none focus:ring-2 focus:ring-brand-blue"
                style={{ fontFamily: "var(--font-quicksand)" }}
              />
              {error ? (
                <p className="mt-2 text-sm font-semibold text-brand-pink">{error}</p>
              ) : null}
              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="rounded-full border-2 border-brand-deep bg-white px-4 py-2 text-sm font-bold text-brand-deep transition-colors hover:bg-brand-cream disabled:opacity-60"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="rounded-full border-2 border-brand-deep bg-brand-yellow px-5 py-2 text-sm font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:opacity-60"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  {pending ? "Sending…" : "Send to the studio"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
