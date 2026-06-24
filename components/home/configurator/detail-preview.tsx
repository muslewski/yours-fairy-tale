"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { DetailLevel } from "@/lib/pricing";

/**
 * Live preview for the selected configurator detail level: an admin-chosen
 * site-media image plus title/description, swapped as the parent changes tier.
 * Every field is optional — render nothing extra when a field is unset (no
 * broken <img>, no empty box). Falls back to `note` when `description` is empty
 * and to `label` when `title` is empty.
 */
export function DetailPreview({ detail }: { detail: DetailLevel }) {
  const reduce = useReducedMotion();
  const heading = detail.title || detail.label;
  const body = detail.description || detail.note;

  // Nothing meaningful to preview beyond what Segmented already shows.
  if (!detail.image && !detail.title && !detail.description) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={detail.id}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="mt-4 overflow-hidden rounded-2xl border-[3px] border-brand-deep bg-brand-cream shadow-comic-sm"
      >
        {detail.image && (
          <img
            src={detail.image}
            alt={heading}
            loading="lazy"
            className="block aspect-[16/9] w-full object-cover"
          />
        )}
        <div className="p-4">
          <p className="font-[family-name:var(--font-fredoka)] text-lg font-semibold text-brand-deep">
            {heading}
          </p>
          {body && <p className="mt-1 text-sm font-medium text-brand-deep/70">{body}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
