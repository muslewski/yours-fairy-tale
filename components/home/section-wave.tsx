import { cn } from "@/lib/utils";

/**
 * Decorative wave divider between two solid-color homepage sections.
 *
 * Renders a full-width block whose BACKGROUND is the `from` color (matching the
 * section above) with a bottom-anchored SVG wave FILLED with the `to` color
 * (matching the section below). Because both are solid brand tokens that match
 * the adjacent sections exactly, it reads as one seamless wavy color transition.
 *
 * The brand's deep-ink crest outline is drawn on the wave edge, except when the
 * fill is navy (`to === "deep"`) — ink is invisible there, so the light→dark
 * contrast carries the divider instead.
 *
 * Static and decorative: no animation (nothing to guard for reduced motion),
 * `aria-hidden`, no semantic role.
 */

type BrandColor = "yellow" | "cream" | "deep" | "pink" | "blue";
type Amplitude = "gentle" | "medium" | "bounce";

// Full literal class names so Tailwind's scanner detects them (no dynamic strings).
const BG: Record<BrandColor, string> = {
  yellow: "bg-brand-yellow",
  cream: "bg-brand-cream",
  deep: "bg-brand-deep",
  pink: "bg-brand-pink",
  blue: "bg-brand-blue",
};

const FILL: Record<BrandColor, string> = {
  yellow: "fill-brand-yellow",
  cream: "fill-brand-cream",
  deep: "fill-brand-deep",
  pink: "fill-brand-pink",
  blue: "fill-brand-blue",
};

// viewBox is 0 0 1200 120. `fill` is the closed wave shape; `crest` is the open
// top edge (stroked with the ink outline).
const WAVES: Record<Amplitude, { fill: string; crest: string }> = {
  gentle: {
    fill: "M0,60 C400,95 800,25 1200,60 L1200,120 L0,120 Z",
    crest: "M0,60 C400,95 800,25 1200,60",
  },
  medium: {
    fill: "M0,64 C300,30 500,98 700,64 C900,34 1050,92 1200,58 L1200,120 L0,120 Z",
    crest: "M0,64 C300,30 500,98 700,64 C900,34 1050,92 1200,58",
  },
  bounce: {
    fill: "M0,70 C200,10 400,120 600,70 C800,20 1000,120 1200,65 L1200,120 L0,120 Z",
    crest: "M0,70 C200,10 400,120 600,70 C800,20 1000,120 1200,65",
  },
};

interface SectionWaveProps {
  /** Color of the section above — the divider's background. */
  from: BrandColor;
  /** Color of the section below — the wave fill. */
  to: BrandColor;
  /** Wave intensity (gentle ↔ bounce dial). Default "medium". */
  amplitude?: Amplitude;
  /** Draw the deep-ink crest outline. Default true; auto-off when `to` is navy. */
  crest?: boolean;
  /** Mirror horizontally so consecutive waves aren't identical. */
  flip?: boolean;
  className?: string;
}

export function SectionWave({
  from,
  to,
  amplitude = "medium",
  crest = true,
  flip = false,
  className,
}: SectionWaveProps) {
  const paths = WAVES[amplitude];
  const showCrest = crest && to !== "deep";

  return (
    <div
      aria-hidden="true"
      className={cn("relative h-14 w-full sm:h-20 lg:h-24", BG[from], className)}
    >
      <svg
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        className={cn("absolute inset-0 block h-full w-full", flip && "-scale-x-100")}
      >
        <path d={paths.fill} className={FILL[to]} />
        {showCrest && (
          <path
            d={paths.crest}
            fill="none"
            className="stroke-brand-deep"
            strokeWidth={4}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}
