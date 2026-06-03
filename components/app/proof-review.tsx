"use client";

/**
 * ProofReview — the proof_ready action (Task 4.3).
 *
 * Shows the parent their preview (an image or a video, by mime type) with two
 * gentle choices: approve it, or ask for a change with a short note. Both call
 * ownership-checked server actions; the page revalidates so the card moves on
 * to the next stage.
 *
 * Motion is guarded by useReducedMotion(): the request-a-change panel expands
 * with a small height/opacity transition that becomes an instant toggle when
 * reduced motion is preferred.
 */
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { approveProof, requestProofChange } from "@/lib/order-actions";

interface ProofMedia {
  url?: string | null;
  mimeType?: string | null;
  alt?: string | null;
}

interface ProofReviewProps {
  orderId: string;
  childName?: string;
  proof?: ProofMedia | null;
}

export function ProofReview({ orderId, childName, proof }: ProofReviewProps) {
  const reduce = useReducedMotion();
  const [changing, setChanging] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const subject = childName?.trim() || "your child";
  const isVideo = proof?.mimeType?.startsWith("video/");
  const isImage = proof?.mimeType?.startsWith("image/");

  function onApprove() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        await approveProof(orderId);
      } catch {
        setError("Something went wrong. Please try again in a moment.");
      }
    });
  }

  function onRequestChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || note.trim().length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        await requestProofChange(orderId, note.trim());
      } catch {
        setError("Something went wrong. Please try again in a moment.");
      }
    });
  }

  return (
    <div
      className="mt-5 rounded-2xl border-2 border-brand-deep bg-brand-cream p-5"
      data-action-slot="proof_ready"
    >
      <h3
        className="text-lg text-brand-deep"
        style={{ fontFamily: "var(--font-fredoka)" }}
      >
        Watch {subject}&rsquo;s preview
      </h3>
      <p
        className="mt-1 text-sm text-brand-deep/70"
        style={{ fontFamily: "var(--font-quicksand)" }}
      >
        Take your time. When it feels right, approve it. If anything should
        change, tell us and we will make it right.
      </p>

      {/* The proof itself — video, image, or a plain link as a fallback. */}
      <div className="mt-4 overflow-hidden rounded-2xl border-2 border-brand-deep bg-white">
        {proof?.url && isVideo ? (
          <video
            src={proof.url}
            controls
            className="aspect-video w-full bg-brand-deep"
          />
        ) : proof?.url && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proof.url}
            alt={proof.alt || `A preview of ${subject}'s story`}
            className="w-full"
          />
        ) : proof?.url ? (
          <a
            href={proof.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center px-5 py-8 font-semibold text-brand-deep underline"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Open your preview
          </a>
        ) : (
          <p
            className="px-5 py-8 text-center text-sm text-brand-deep/60"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Your preview is on its way. Check back in a moment.
          </p>
        )}
      </div>

      {error ? (
        <p
          className="mt-3 text-sm font-semibold text-brand-pink"
          style={{ fontFamily: "var(--font-quicksand)" }}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onApprove}
          disabled={pending}
          className="inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-yellow px-6 py-3 font-bold text-brand-deep shadow-comic-sm transition-shadow hover:shadow-comic disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          {pending ? "Saving" : "Approve this preview"}
        </button>
        <button
          type="button"
          onClick={() => {
            setChanging((v) => !v);
            setError(null);
          }}
          disabled={pending}
          className="inline-flex items-center rounded-full border-2 border-brand-deep bg-white px-6 py-3 font-bold text-brand-deep transition-shadow hover:shadow-comic-sm disabled:cursor-not-allowed disabled:opacity-50"
          style={{ fontFamily: "var(--font-fredoka)" }}
          aria-expanded={changing}
        >
          Request a change
        </button>
      </div>

      <AnimatePresence initial={false}>
        {changing ? (
          <motion.form
            onSubmit={onRequestChange}
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.25 }}
            className="overflow-hidden"
          >
            <label
              htmlFor={`revision-${orderId}`}
              className="mt-4 block text-sm font-semibold text-brand-deep"
              style={{ fontFamily: "var(--font-quicksand)" }}
            >
              What should we change?
            </label>
            <textarea
              id={`revision-${orderId}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder={`For example: could ${subject}'s hair be a little curlier?`}
              className="mt-2 w-full rounded-2xl border-2 border-brand-deep bg-white px-4 py-3 text-brand-deep placeholder:text-brand-deep/40 focus:outline-none focus:ring-2 focus:ring-brand-blue"
              style={{ fontFamily: "var(--font-quicksand)" }}
            />
            <button
              type="submit"
              disabled={pending || note.trim().length === 0}
              className="mt-3 inline-flex items-center rounded-full border-2 border-brand-deep bg-brand-pink px-6 py-3 font-bold text-white shadow-comic-sm transition-shadow hover:shadow-comic disabled:cursor-not-allowed disabled:opacity-50"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              {pending ? "Sending your note" : "Send my note"}
            </button>
          </motion.form>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
