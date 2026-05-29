"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * Springy staggered reveal for lists (nav items, footer links, etc.).
 * Children should be <StaggerItem>s. `trigger="mount"` plays on load (good for
 * above-the-fold nav); `trigger="view"` plays when scrolled into view (footer).
 * Storybook feel: items pop up with a little overshoot (spring + mass).
 */
const groupVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.85 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 18, mass: 0.7 },
  },
};

/** A gentle, jitter-safe hover pop (scale up keeps the cursor inside the element). */
export const hoverPop = {
  scale: 1.12,
  rotate: -3,
  transition: { type: "spring" as const, stiffness: 400, damping: 10 },
};
export const tapPop = { scale: 0.94 };

type StaggerProps = {
  children: ReactNode;
  className?: string;
  trigger?: "mount" | "view";
  as?: "div" | "ul" | "nav";
};

export function Stagger({ children, className, trigger = "view", as = "div" }: StaggerProps) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{children}</Plain>;
  }

  const Comp = as === "ul" ? motion.ul : as === "nav" ? motion.nav : motion.div;
  const trig =
    trigger === "mount"
      ? { animate: "show" }
      : { whileInView: "show", viewport: { once: true, margin: "-60px" } as const };

  return (
    <Comp className={className} variants={groupVariants} initial="hidden" {...trig}>
      {children}
    </Comp>
  );
}

type ItemTag = "div" | "li" | "span" | "a";

type StaggerItemProps = {
  as?: ItemTag;
  children: ReactNode;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} & Record<string, any>;

export function StaggerItem({ as = "div", children, ...rest }: StaggerItemProps) {
  // Polymorphic motion tag; per-tag props are validated at call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Comp: any =
    as === "li" ? motion.li : as === "span" ? motion.span : as === "a" ? motion.a : motion.div;
  return (
    <Comp variants={itemVariants} {...rest}>
      {children}
    </Comp>
  );
}
