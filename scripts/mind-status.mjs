#!/usr/bin/env node
/**
 * mind-status.mjs — Portable SessionStart status line for a repo's Mind.
 * Pure node, zero deps, non-blocking. FLEET TEMPLATE.
 * Prints one line: zone count + open tech-debt for the local <repo>-mind vault.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url))) // <repo>/scripts/ -> <repo>

function findMindDir() {
  try {
    const hit = readdirSync(ROOT, { withFileTypes: true }).find((e) => e.isDirectory() && e.name.endsWith('-mind'))
    return hit ? join(ROOT, hit.name) : null
  } catch { return null }
}

const mind = findMindDir()
if (!mind) process.exit(0)

const countMd = (dir, pred) => {
  if (!existsSync(dir)) return 0
  return readdirSync(dir).filter((f) => f.endsWith('.md') && (!pred || pred(readFileSync(join(dir, f), 'utf8')))).length
}

const zones = countMd(join(mind, 'map', 'zones'), (b) => !/^status:\s*unmounted/m.test(b))
const debt = countMd(join(mind, 'tech-debt'), (b) => /^status:\s*open/m.test(b))
const specs = countMd(join(mind, 'specs'))

const parts = [`🧠 ${basename(mind)}: ${zones} zones`]
if (specs) parts.push(`${specs} specs`)
if (debt) parts.push(`⚠ ${debt} open debt`)
console.log(parts.join(' · '))
