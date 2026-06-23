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
  // Detect the vault by structure (map/ dir), not name — finds -mind, -brain, etc.
  try {
    const dirs = readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
      .map((e) => e.name)
    const byStructure = dirs.find((n) => existsSync(join(ROOT, n, 'map', 'index.md')) || existsSync(join(ROOT, n, 'map', 'zones')))
    if (byStructure) return join(ROOT, byStructure)
    const bySuffix = dirs.find((n) => n.endsWith('-mind') || n.endsWith('-brain'))
    return bySuffix ? join(ROOT, bySuffix) : null
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
