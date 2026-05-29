"use client";

import { Fragment } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * Storybook-style heading: each word springs up, rotates into place, and
 * settles with a little bounce (spring + mass), staggered left to right.
 * Triggers when scrolled into view. Falls back to plain text under
 * prefers-reduced-motion.
 */
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const wordVariant: Variants = {
  hidden: { opacity: 0, y: 28, rotate: -8, scale: 0.8 },
  show: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 210, damping: 13, mass: 0.85 },
  },
};

type Props = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
};

export function AnimatedHeading({ text, className, as = "h2" }: Props) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  if (reduce) {
    const Plain = as;
    return <Plain className={className}>{text}</Plain>;
  }

  const MotionTag = as === "h1" ? motion.h1 : as === "h3" ? motion.h3 : motion.h2;

  return (
    <MotionTag
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <Fragment key={i}>
          <motion.span variants={wordVariant} className="inline-block" aria-hidden>
            {w}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </MotionTag>
  );
}
