/**
 * The story worlds (plots) a parent can pick for their child's video.
 *
 * Single source of truth shared by the configurator (the picker) and the
 * customer dashboard (friendly labels on each order card). The ids match the
 * `world` select options in collections/Orders.ts.
 */

export type WorldId =
  | "bedtime"
  | "space"
  | "sea"
  | "forest"
  | "dragons"
  | "birthday"
  | "custom";

/** Friendly names for the story worlds, keyed by world id. */
export const WORLD_LABELS: Record<WorldId, string> = {
  bedtime: "Bedtime adventure",
  space: "Outer space",
  sea: "Under the sea",
  forest: "Enchanted forest",
  dragons: "Dragons and castles",
  birthday: "Birthday surprise",
  custom: "A story of your own",
};

/** Ordered list for rendering the picker. */
export const WORLDS: { id: WorldId; label: string }[] = (
  Object.keys(WORLD_LABELS) as WorldId[]
).map((id) => ({ id, label: WORLD_LABELS[id] }));

export function isWorldId(value: unknown): value is WorldId {
  return typeof value === "string" && value in WORLD_LABELS;
}
