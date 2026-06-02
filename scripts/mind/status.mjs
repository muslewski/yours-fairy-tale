#!/usr/bin/env node
// SessionStart orientation line. Pure file I/O — no exec.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const INDEX = join(ROOT, "fairy-tale-mind", "map", "index.md");

if (!existsSync(INDEX)) {
  console.log("🧠 Mind: index not built yet — run `npm run mind` (or /map-sync).");
  process.exit(0);
}

const m = readFileSync(INDEX, "utf8").match(/mind:counts zones=(\d+) stale=(\d+) debt=(\d+)/);
if (m) {
  const [, zones, stale, debt] = m;
  const staleNote = Number(stale) ? ` (${stale} ⚠ stale)` : "";
  console.log(
    `🧠 Mind: ${zones} zones${staleNote} · ${debt} open tech-debt — orient via fairy-tale-mind/map/index.md before coding.`,
  );
} else {
  console.log("🧠 Mind: orient via fairy-tale-mind/map/index.md before coding.");
}
