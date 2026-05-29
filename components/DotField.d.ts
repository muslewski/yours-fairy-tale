import type { ComponentPropsWithoutRef, FC } from "react";

/**
 * Props for the React Bits DotField component (JS-CSS variant).
 * Hand-authored types for the untyped `DotField.jsx`; the runtime still
 * imports the .jsx. shadcn only overwrites DotField.jsx/.css on re-install,
 * so this file is safe.
 */
export interface DotFieldProps extends ComponentPropsWithoutRef<"div"> {
  /** Radius of each dot in px (drawn radius is half this). */
  dotRadius?: number;
  /** Gap between dots in px. */
  dotSpacing?: number;
  /** Cursor influence radius in px. */
  cursorRadius?: number;
  /** Repulsion force (used when bulgeOnly is false). */
  cursorForce?: number;
  /** Push dots outward around the cursor instead of scattering them. */
  bulgeOnly?: boolean;
  /** Strength of the bulge displacement. */
  bulgeStrength?: number;
  /** Radius of the cursor glow halo in px. */
  glowRadius?: number;
  /** Randomly enlarge a few dots for a twinkle effect. */
  sparkle?: boolean;
  /** Idle wave motion amplitude (0 = static at rest). */
  waveAmplitude?: number;
  /** Dot fill gradient start color (any CSS color). */
  gradientFrom?: string;
  /** Dot fill gradient end color (any CSS color). */
  gradientTo?: string;
  /** Color of the cursor glow halo (any CSS color). */
  glowColor?: string;
}

declare const DotField: FC<DotFieldProps>;

export default DotField;
