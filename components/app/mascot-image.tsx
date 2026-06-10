"use client";

/**
 * MascotImage — the animated builder, politely. Renders the static frame by
 * default (matching the server render — no hydration flash) and swaps in the
 * animated WebP only when the visitor does NOT prefer reduced motion.
 * Plain <img>: Next's optimizer would serve the animated file unanimated.
 */
import { useEffect, useState } from "react";

export function MascotImage({
  animatedSrc,
  staticSrc,
  width,
  height,
  className,
}: {
  animatedSrc: string;
  staticSrc: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [src, setSrc] = useState(staticSrc);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setSrc(query.matches ? staticSrc : animatedSrc);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [animatedSrc, staticSrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- animated webp
    <img
      src={src}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
