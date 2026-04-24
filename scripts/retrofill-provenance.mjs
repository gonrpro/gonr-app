#!/usr/bin/env node
/**
 * TASK-055 — honest retro-fill of provenance columns.
 *
 * Classifies each card in data/core/ by verification_level using ONLY the
 * signals the library already carries. Does NOT invent citations.
 *
 * Classification ladder (conservative — downgrade when uncertain):
 *
 *   pro_verified  — no card earns this from heuristics. Must be set manually
 *                   when an external pro reviewer (Dan Eisen, DLI, etc.) signs off.
 *
 *   cross_ref     — card has `verified: true` on the data itself (TASK-061 voice
 *                   pass survived + presentation validator passed in TASK-055's
 *                   companion commit). Implies chemistry review + multiple-pass
 *                   authorship. Honest upper bound from heuristics.
 *
 *   single_source — card has `source: "verified"` but not `verified: true`.
 *                   Went through ONE verification pass at some point (the 2026-04-16
 *                   safety-audit sweep is the most common origin) but presentation /
 *                   voice has not been hand-reviewed.
 *
 *   draft         — everything else: source:null, source:"lab-authored", or any
 *                   card without a verification marker. Not a failure — the gap
 *                   queue Atlas asked for. sources:[] is the honest state.
 *
 * Modes:
 *   --dry-run          Print the planned classification breakdown + per-card diffs, no writes.
 *   --write            Update each data/core/*.json in place with the 3 new fields.
 *   --sql > out.sql    Emit UPDATE statements for Supabase to apply to protocol_cards.
 *
 * The JSON-in-place write is idempotent: re-running on an already-classified
 * card is a no-op unless the signal changed.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve, join, basename } from 'node:path'

const CORE_DIR = resolve(process.cwd(), 'data/core')

function classify(card) {
  // Heuristic upper bound: heuristics cannot earn pro_verified (needs external sign-off)
  if (card?.verified === true) return 'cross_ref'
  if (card?.source === 'verified') return 'single_source'
  // Everything else is honest draft — lab-authored, null, or unknown
  return 'draft'
}

function enumerateCards() {
  return readdirSync(CORE_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const filePath = join(CORE_DIR, f)
      const card = JSON.parse(readFileSync(filePath, 'utf-8'))
      return { filePath, cardId: card?.id ?? basename(f, '.json'), card }
    })
    .sort((a, b) => a.cardId.localeCompare(b.cardId))
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''")
}

function toPgTextArrayLiteral(arr) {
  if (!arr || arr.length === 0) return `'{}'`
  const escaped = arr.map(v => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')
  return `'{${escaped}}'`
}

function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.length === 0
  const write = args.includes('--write')
  const sql = args.includes('--sql')

  const cards = enumerateCards()
  const summary = { draft: 0, single_source: 0, cross_ref: 0, pro_verified: 0 }
  const changes = []
  const sqlLines = []

  for (const { filePath, cardId, card } of cards) {
    const level = classify(card)
    summary[level] += 1

    // Honest retro-fill: sources = [], cross_refs = [] — we do not invent citations.
    // verification_level is the classification we just assigned.
    const newFields = {
      sources: Array.isArray(card?.sources) ? card.sources : [],
      cross_refs: Array.isArray(card?.cross_refs) ? card.cross_refs : [],
      verification_level: level,
    }

    const changedFields = {}
    if (card?.verification_level !== newFields.verification_level) changedFields.verification_level = newFields.verification_level
    if (card?.sources === undefined) changedFields.sources = newFields.sources
    if (card?.cross_refs === undefined) changedFields.cross_refs = newFields.cross_refs

    if (Object.keys(changedFields).length > 0) changes.push({ cardId, changedFields })

    if (write && Object.keys(changedFields).length > 0) {
      const updated = { ...card, ...newFields }
      writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
    }

    if (sql) {
      // card_key in DB = stain_surface (underscore separator, last-hyphen-to-underscore)
      const fileBase = basename(filePath, '.json')
      const i = fileBase.lastIndexOf('-')
      const cardKey = i === -1 ? fileBase : `${fileBase.slice(0, i)}_${fileBase.slice(i + 1)}`
      sqlLines.push(
        `UPDATE public.protocol_cards SET sources = ${toPgTextArrayLiteral(newFields.sources)}, cross_refs = ${toPgTextArrayLiteral(newFields.cross_refs)}, verification_level = '${sqlEscape(newFields.verification_level)}' WHERE card_key = '${sqlEscape(cardKey)}' AND is_active = true AND plant_id IS NULL;`
      )
    }
  }

  if (sql) {
    process.stdout.write(`-- TASK-055 honest retro-fill — ${cards.length} cards\n`)
    process.stdout.write(`-- Classification: ${summary.draft} draft · ${summary.single_source} single_source · ${summary.cross_ref} cross_ref · ${summary.pro_verified} pro_verified\n\n`)
    process.stdout.write('BEGIN;\n\n')
    for (const line of sqlLines) process.stdout.write(line + '\n')
    process.stdout.write('\nCOMMIT;\n')
    return
  }

  console.log(`── TASK-055 provenance classification ──`)
  console.log(`  total cards checked:  ${cards.length}`)
  console.log(`  draft:                ${summary.draft}`)
  console.log(`  single_source:        ${summary.single_source}`)
  console.log(`  cross_ref:            ${summary.cross_ref}`)
  console.log(`  pro_verified:         ${summary.pro_verified}  (heuristics cannot set this)`)
  console.log(``)
  console.log(`  cards needing update: ${changes.length}`)
  if (write) {
    console.log(`  → wrote new fields into data/core/*.json`)
  } else if (dryRun) {
    console.log(`  → dry run; no files touched. Re-run with --write to apply, --sql to emit UPDATE statements.`)
  }
}

main()
