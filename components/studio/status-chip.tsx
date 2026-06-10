/**
 * StatusChip — the studio's colored status pill. Tones map to brand colors;
 * labels come from the workflow core (single source of truth).
 */
import { STATUS_CHIPS } from "@/lib/studio-workflow";
import type { OrderStatus } from "@/lib/order-stages";

const TONE_CLASSES: Record<(typeof STATUS_CHIPS)[OrderStatus]["tone"], string> = {
  yellow: "bg-brand-yellow text-brand-deep",
  pink: "bg-brand-pink text-brand-deep",
  blue: "bg-brand-blue text-brand-deep",
  plain: "bg-white text-brand-deep/70",
};

export function StatusChip({ status }: { status: OrderStatus }) {
  const chip = STATUS_CHIPS[status];
  return (
    <span
      className={`inline-block rounded-full border-2 border-brand-deep px-2.5 py-0.5 text-xs font-bold ${TONE_CLASSES[chip.tone]}`}
      style={{ fontFamily: "var(--font-quicksand)" }}
    >
      {chip.label}
    </span>
  );
}
