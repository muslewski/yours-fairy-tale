export type Variant = {
  slug: string;
  name: string;
  tag: string;
  description: string;
  swatch: string;
};

export const VARIANTS: Variant[] = [
  {
    slug: "1-magic-sparkle",
    name: "Magic Sparkle",
    tag: "Vibrant gradient",
    description: "Soft blob gradients, floating sparkles, glowing CTA.",
    swatch: "from-[#17c7e2] via-[#f042d2] to-[#faca23]",
  },
  {
    slug: "2-bento-grid",
    name: "Bento Grid",
    tag: "Modern modular",
    description: "Editorial bento tiles with bold colour blocks and feature cards.",
    swatch: "from-[#faca23] via-[#f042d2] to-[#17c7e2]",
  },
  {
    slug: "3-glass-dream",
    name: "Glass Dream",
    tag: "Glassmorphism",
    description: "Frosted glass panels over a blurred aurora background.",
    swatch: "from-[#17c7e2] to-[#f042d2]",
  },
  {
    slug: "4-storybook-editorial",
    name: "Storybook Editorial",
    tag: "Magazine serif",
    description: "Big Fraunces serif headlines, paper-cream backdrop.",
    swatch: "from-[#fff9ee] via-[#faca23] to-[#f042d2]",
  },
  {
    slug: "5-aurora-mesh",
    name: "Aurora Mesh",
    tag: "Flowing mesh",
    description: "Layered conic and radial gradients, centred composition.",
    swatch: "from-[#1a1033] via-[#f042d2] to-[#17c7e2]",
  },
  {
    slug: "6-pop-comic",
    name: "Pop Comic",
    tag: "Bold pop art",
    description: "Halftone dots, chunky outlines, sticker badges, comic energy.",
    swatch: "from-[#f042d2] via-[#faca23] to-[#17c7e2]",
  },
  {
    slug: "7-cloud-castle",
    name: "Cloud Castle",
    tag: "Dreamy sky",
    description: "Pastel sky with clouds, both illustrations gently floating.",
    swatch: "from-[#17c7e2] via-[#bff5fb] to-[#fff9ee]",
  },
  {
    slug: "8-neumorph-pastel",
    name: "Soft Pastel",
    tag: "Neumorphic calm",
    description: "Plush soft shadows, rounded controls, peaceful pastels.",
    swatch: "from-[#fff9ee] via-[#fde2f7] to-[#cdf3fa]",
  },
  {
    slug: "9-sticker-sheet",
    name: "Sticker Sheet",
    tag: "Hand-drawn playful",
    description: "Tilted sticker badges, dashed borders, doodle accents.",
    swatch: "from-[#faca23] via-[#17c7e2] to-[#f042d2]",
  },
  {
    slug: "10-floating-3d",
    name: "Floating 3D",
    tag: "Depth & shadow",
    description: "Layered cards, perspective tilt, vibrant deep-purple stage.",
    swatch: "from-[#1a1033] via-[#3b1d6e] to-[#f042d2]",
  },
];
